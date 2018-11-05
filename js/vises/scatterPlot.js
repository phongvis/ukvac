/**
 * scatterPlot module provides a standard scatter plot representation.
 * Source: http://bl.ocks.org/mbostock/3887118
 */
ivs.vises.scatterPlot = function() {
    // Base
    var module = ivs.vises.baseVis().className("ivs-scatterPlot");
    var width, height, container, data, attributeMappings;

    var DOT_SIZE = 8,
        margin = { top: 0, right: 0, bottom: 30, left: 40 }, // The margin of the core chart
        xScale = d3.scale.linear(), // d3.scale of x-value
        yScale = d3.scale.linear(), // d3.scale of y-value
        xAxis, yAxis, // d3.svg.axis
        xLabel, yLabel, // label for axis
        chart, // The g element inside the container, stores the core chart after being transformed by the margin
        clipPath, // To prevent zoom/pan outside of chart area
        scale = 1, // Zoom factor of the inner chart
        translate = [0, 0], // Translate of the inner chart
        brush,
        zoom,
        nameValue = function(d) { return d.name.htmlDecode(); }, // Accessor to get value for display name of dots
        xIndex = 0, yIndex = 1, // Index of x-value and y-value in attribute mappings
        xValue, yValue, xAxisName, yAxisName, // Detailed attribute mappings
        key = function(d) { return d.name; };  // Default key 'name' to allow object-constancy when binding. 

    /**
    * Overrides the visualisation creation method.
    */
    module.buildVis = function() {
        // Retrieve properties from the base.
        container = this.container();
        data = this.data();
        width = this.width() - margin.left - margin.right ;
        height = this.height() - margin.top - margin.bottom;
        attributeMappings = this.attributeMappings();

        mapAttributes();
    };

    /**
     * Resets to the default view.
     */
    module.resetView = function() {
        zoom.scale(1);
        zoom.translate([0, 0]);
        zoom.event(chart.transition().duration(ivs.TRANSITION_MOVEMENT));
    };

    /**
     * Maps attributes to their visual encodings. X-axis represents what? Y-axis represents what?
     */
    function mapAttributes() {
        xValue = attributeMappings[xIndex].value;
        xAxisName = attributeMappings[xIndex].name;
        yValue = attributeMappings[yIndex].value;
        yAxisName = attributeMappings[yIndex].name;

        buildVis();
    }
    
    /**
     * Concrete classes modifies this function to create visualisation.
     */
    function buildVis() {
        // Update scale
        xScale.rangeRound([0, width]);
        yScale.rangeRound([height, 0]);

        // Extend domain by 10% to have nice gap at both ends
        var xRange = d3.extent(data, xValue);
        var diff = xRange[1] - xRange[0];
        diff = diff === 0 ? 1 : diff;
        xRange[0] -= diff * 0.05;
        // xRange[0] = Math.max(0, xRange[0]);
        xRange[1] += diff * 0.05;
        var yRange = d3.extent(data, yValue);
        diff = yRange[1] - yRange[0];
        diff = diff === 0 ? 1 : diff;
        yRange[0] -= diff * 0.05;
        // yRange[0] = Math.max(0, yRange[0]);
        yRange[1] += diff * 0.05;
        xScale.domain(xRange);
        yScale.domain(yRange);

        // Zoom/pan
        zoom = d3.behavior.zoom()
            .x(xScale)
            .y(yScale)
            .scale(scale)
            .translate(translate)
            .size([width, height])
            .on("zoomstart", function() { // The inside element will be called first, stop propagate if not holding ALT
                if (!d3.event.sourceEvent) { return; }

                if (!d3.event.sourceEvent.altKey) { // Not holding ALT, I will handle myself
                    d3.event.sourceEvent.stopPropagation();
                }
            }).on("zoom", function() {
                if (d3.event.sourceEvent) { 
                    if (d3.event.sourceEvent.shiftKey || d3.event.sourceEvent.ctrlKey) { // SHIFT for brush, CTRL for drag
                        // Revert the changes
                        zoom.scale(scale);
                        zoom.translate(translate);
                        return;
                    }
                }

                // Update axes
                chart.select(".x.axis").call(xAxis);
                chart.select(".y.axis").call(yAxis);

                // Update dots
                chart.selectAll("g.ivs-scatterPlot-dot")
                    .attr("transform", function(d) { return "translate(" + xScale(xValue.call(this, d)) + "," + yScale(yValue.call(this, d)) + ")"; });

                scale = d3.event.scale;
                translate = d3.event.translate;     
            });

        if (!chart) {
            chart = container.append("g");
            chart.append("rect").classed("background", true).style("opacity", 0);
        }

        chart.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        chart.select("background").attr("width", width).attr("height", height);
        chart.call(zoom).on("dblclick.zoom", null);

        // Brush: should be placed below dots to make dots clickable
        if (!brush) {
            brush = chart.append("g")
                .datum(function() { return { selected: false, previouslySelected: false}; })
                .attr("class", "brush");
        }
        brush.call(d3.svg.brush()
            .x(xScale)
            .y(yScale)
            .on("brushstart", function(d) {
                dots.each(function(d) { d.previouslySelected = d3.event.sourceEvent.ctrlKey && d.selected; });
            }).on("brush", function() {
                var extent = d3.event.target.extent();
                dots.classed("selected", function(d) {
                    d.selected = d.previouslySelected ^ (extent[0][0] <= xValue.call(this, d) && xValue.call(this, d) < extent[1][0] && extent[0][1] <= yValue.call(this, d) && yValue.call(this, d) < extent[1][1]);
                    d3.select(this).select(".name").style("fill", d.selected ? "block" : "none");

                    return d.selected;
                });
                module.setSelected(dots, key);
            }).on("brushend", function() {
                d3.event.target.clear();
                d3.select(this).call(d3.event.target);
            }));

        // Dots
        var dotsContainer = chart.selectAll("g.ivs-scatterPlot-dotContainer").data([0]);
        dotsContainer.enter().append("g").classed("ivs-scatterPlot-dotContainer", true);

        var dots = dotsContainer.selectAll("g").data(data, key);
        var newDots = dots.enter().append("g").attr("class", "ivs-scatterPlot-dot");
        newDots.append("circle")
            .attr("r", DOT_SIZE)
            .on("dblclick", function(d) {
                if (module.activeMapping() !== "articles") { return; }
                // Mark it as read
                ivs.viewedArticlesDict[d.id] = true;

                var self = this;
                var contentViewer = ivs.widgets.contentViewer()
                    .on("documentClosed", function(e) {
                        // Store the taken notes
                        if (e.notes !== "") {
                            ivs.notesDict[d.id] = { note: e.notes, data: d };
                        } else {
                            delete ivs.notesDict[d.id];
                        }
                    });
                d.abstract = d.blurb;
                d.references = d.drill_1;
                d.notes = ivs.notesDict[d.id] ? ivs.notesDict[d.id].note : "";
                d3.select(this).call(contentViewer);
            });
            // .on("click", function(d) {
            //     if (d3.event.altKey) { return; } // Pan

            //     if (d3.event.ctrlKey) {
            //         var parent = d3.select(this.parentNode);
            //         parent.classed("selected", d.selected = !d.selected);
            //         parent.select(".name").style("fill", d.selected ? "black" : "none");
            //     } else {
            //         dots.classed("selected", function(p) { 
            //             p.selected = d === p;
            //             if (p.selected) {
            //                 d3.select(this).moveToFront();
            //             }
            //             d3.select(this).select(".name").style("fill", p.selected ? "black" : "none");

            //             return p.selected; 
            //         });
            //     }

            //     module.setSelected(dots, key);
            // });
        newDots.append("text")
            .classed("name", true)
            .attr("y", DOT_SIZE)
            .attr("dy", "1em")
            .style("fill", "none")
            .text(nameValue);

        var titleFunction = module.activeMapping() === "authors" ? function(d) { return d.name + ": " + d.x + " out of " + d.totalPublications + " total publications\n" + d.articles; } : nameValue;
        newDots.append("title")
            .text(titleFunction);

        // Register click event
        module.registerClickEvent(newDots, key);

        // Update selection, brushing
        module.updateSelectionBrushing(dots, nameValue, updateDotText);

        // Register to be brushed
        module.registerBrushedEvent(dots, nameValue, updateDotText);

        // Register for dragging items
        if (module.activeMapping() === "authors") {
            module.registerDragEvent(newDots, true, mergeItems);
        } else {
            module.registerDragEvent(newDots);
        }

        // Register for deselection when clicking on empty space
        module.registerDeselection(chart, newDots);

        dots.transition().duration(ivs.TRANSITION_MOVEMENT)
            .attr("transform", function(d) { return "translate(" + xScale(xValue.call(this, d)) + "," + yScale(yValue.call(this, d)) + ")"; });

        // EXIT
        dots.exit().transition().duration(ivs.TRANSITION_MOVEMENT).style("opactiy", 0).remove();

        // Clip-path to prevent zooming outside the area
        if (!clipPath) {
            clipPath = dotsContainer.append("clipPath").attr("id", "chart-area").append("rect");
            dotsContainer.attr("clip-path", "url(#chart-area)");
        }
        clipPath.attr("width", width).attr("height", height);

        // x-axis
        if (!xAxis) {
            xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .tickFormat(d3.format("d"));
        }
        var mappingTexts = attributeMappings.map(function(d) { return d.name; });
        if (!xLabel) {
            xLabel = ivs.widgets.cycleButton().className("ivs-baseVis-cycleButton")               
                .on("indexChanged", function(index) {
                    xIndex = index;
                    mapAttributes();
                });
        }
        xLabel.texts(mappingTexts).currentIndex(xIndex);

        var g = chart.selectAll(".x.axis").data([0]);
        g.enter().append("g").classed("x axis", true);
        g.attr("transform", "translate(0," + height + ")").call(xAxis);
        var g2 = g.selectAll(".xLabel").data([0]);
        g2.enter().append("g").classed("xLabel", true);
        g2.attr("transform", "translate(" + width + ",-6)").call(xLabel);

        // y-axis
        if (!yAxis) {
            yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left")
                .tickFormat(d3.format("d"));
        }
        if (!yLabel) {
            yLabel = ivs.widgets.cycleButton().className("ivs-baseVis-cycleButton")               
                .on("indexChanged", function(index) {
                    yIndex = index;
                    mapAttributes();
                });
        }
        yLabel.texts(mappingTexts).currentIndex(yIndex);

        g = chart.selectAll(".y.axis").data([0]);
        g.enter().append("g").classed("y axis", true);
        g.call(yAxis);
        g2 = g.selectAll(".yLabel").data([0]);
        g2.enter().append("g").classed("yLabel", true);
        g2.attr("transform", "translate(" + (11 + DOT_SIZE) + ",0) rotate(-90)").call(yLabel);
    }

    function updateDotText() {
        chart.selectAll("g.ivs-scatterPlot-dot").each(function() {
            if (d3.select(this).classed("selected")) {
                d3.select(this).moveToFront();
                d3.select(this).select(".name").style("fill", "black");
            } else {
                d3.select(this).select(".name").style("fill", "none");
            }
        });
    }

    function mergeItems(dragObject, dropTarget) {
        // Add new item drag and drop items
        var mergeItem = {};
        mergeItem.name = dragObject.name +  " & " + dropTarget.name;
        mergeItem.totalPublications = dragObject.totalPublications + dropTarget.totalPublications;
        mergeItem.x = dragObject.x + dropTarget.x;
        mergeItem.y = dragObject.y + dropTarget.y;
        mergeItem.articles = dragObject.articles + "\n" + dropTarget.articles;
        data.push(mergeItem);

        // Remove two old items
        data.splice(data.indexOf(dragObject), 1);
        data.splice(data.indexOf(dropTarget), 1);

        // Refresh
        buildVis();
    }
    
    /**
     * Sets/Gets the index in the attribute mappings of x-value.
     */
    module.xIndex = function(value) {
        if (!arguments.length) return xIndex;
        xIndex = value;
        return this;
    };

    /**
     * Sets/Gets the index in the attribute mappings of y-value.
     */
    module.yIndex = function(value) {
        if (!arguments.length) return yIndex;
        yIndex = value;
        return this;
    };

    /**
     * Sets/Gets the name-accessor value.
     */
    module.nameValue = function(value) {
        if (!arguments.length) return nameValue;
        nameValue = value;
        return this;
    };

    /**
     * Sets/Gets the key function.
     */
    module.key = function(value) {
        if (!arguments.length) return key;
        key = value;
        return this;
    };

    /**
     * Returns the name of visualisation.
     */
    module.visType = function() {
        return "scatterPlot";
    };

    return module;
};