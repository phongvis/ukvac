/**
 * barChart module provides a standard scatter plot representation.
 * Source: http://bl.ocks.org/mbostock/3885304
 */
ivs.vises.barChart = function() {
    // Base
    var module = ivs.vises.baseVis().className("ivs-barChart");
    var width, height, container, data, attributeMappings;

    var margin = { top: 10, right: 0, bottom: 40, left: 40 }, // The margin of the core chart
        xScale = d3.scale.ordinal(), // d3.scale of x-value
        yScale = d3.scale.linear(), // d3.scale of y-value
        cScale = d3.scale.linear().range(["#BCBDDC", "#756BB1"]), // For color-coded bars
        xAxis, yAxis, // d3.svg.axis
        yLabel, // label for axis
        chart, // The g element inside the container, stores the core chart after being transformed by the margin
        scale = 1, // Zoom factor of the inner chart
        translate = [0, 0], // Translate of the inner chart
        brush,
        xValue = function(d) { return d.name; },
        yIndex = 0, // Index of y-value in attribute mappings
        yValue, yAxisName; // Detailed attribute mappings

    // Default key 'name' to allow object-constancy when binding. 
    var key = function(d) {
        return d.name;
    };

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
    }

    /**
     * Maps attributes to their visual encodings. Y-axis represents what?
     */
    function mapAttributes() {
        yValue = attributeMappings[yIndex].value;
        yAxisName = attributeMappings[yIndex].name;

        buildVis();
    }
    
    /**
     * Concrete classes modifies this function to create visualisation.
     */
    function buildVis() {
        // Update scale
        xScale.rangeRoundBands([0, width], .1, .4);
        yScale.rangeRound([height, 0]);

        xScale.domain(data.map(xValue));
        yScale.domain([0, d3.max(data, yValue)]);

        if (!chart) {
            chart = container.append("g");
            chart.append("rect").classed("background", true).style("opacity", 0);
        }
        chart.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        chart.select("background").attr("width", width).attr("height", height);

        // Brush: should place before bars so that bars are on top of the brush
        if (!brush) {
            brush = chart.append("g")
                .datum(function() { return { selected: false, previouslySelected: false}; })
                .attr("class", "brush");
        }
        brush.call(d3.svg.brush()
            .x(xScale)
            .y(yScale)
            .on("brushstart", function(d) {
                bars.each(function(d) { d.previouslySelected = d3.event.sourceEvent.ctrlKey && d.selected; });
            }).on("brush", function() {
                var extent = d3.event.target.extent();
                var extentRect = { left: extent[0][0], right: extent[1][0], top: extent[0][1], bottom: extent[1][1] };
                bars.classed("selected", function(d) {
                    var rect = { left: xScale(xValue.call(this, d)), right: xScale(xValue.call(this, d)) + xScale.rangeBand(), top: 0, bottom: yValue.call(this, d) };
                    var intersected = ivs.helpers.d3.isIntersected(extentRect, rect);
                    d.selected = d.previouslySelected ^ intersected;
                    d3.select(this).select(".name").style("fill", d.selected ? "block" : "none");

                    return d.selected;
                });
                module.setSelected(bars, key);
            }).on("brushend", function() {
                d3.event.target.clear();
                d3.select(this).call(d3.event.target);
            }));

        // Bars
        var barsContainer = chart.selectAll("g.ivs-barChart-barContainer").data([0]);
        barsContainer.enter().append("g").classed("ivs-barChart-barContainer", true);

        var bars = barsContainer.selectAll("g").data(data);
        var newbars = bars.enter().append("g").attr("class", "ivs-barChart-bar");
        newbars.append("rect")
            .attr("x", function(d) { return xScale(xValue.call(this, d)); })
            .attr("width", xScale.rangeBand());
            // .on("click", function(d) {
            //     if (d3.event.altKey) { return; } // Pan

            //     if (d3.event.ctrlKey) {
            //         var parent = d3.select(this.parentNode);
            //         parent.classed("selected", d.selected = !d.selected);
            //         parent.select(".name").style("fill", d.selected ? "black" : "none");
            //     } else {
            //         bars.classed("selected", function(p) { 
            //             p.selected = d === p
            //             d3.select(this).select(".name").style("fill", p.selected ? "black" : "none");

            //             return p.selected; 
            //         });
            //     }
            // });
        bars.select("rect")
            .transition().duration(ivs.TRANSITION_MOVEMENT)
            .attr("y", function(d) { return yScale(yValue.call(this, d)); })
            .attr("height", function(d) { return height - yScale(yValue.call(this, d)); });
        var titleFunction = module.activeMapping() === "authors" ? function(d) { return d.name + ": " + d.x + " out of " + d.totalPublications + " total publications\n" + d.articles; } : function(d) { return d.articles; };
        bars.append("title")
            .text(titleFunction);

        // Register click event
        module.registerClickEvent(newbars, key);

        // Update selection, brushing
        module.updateSelectionBrushing(bars, key, updateDotText);

        // Register to be brushed
        module.registerBrushedEvent(bars, key, updateDotText);

        // Register for dragging items
        module.registerDragEvent(newbars);

        // Register for deselection when clicking on empty space
        module.registerDeselection(chart, newbars);

        // x-axis
        if (!xAxis) {
            xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .tickFormat(String);
        }

        var g = chart.selectAll(".x.axis").data([0]);
        g.enter().append("g").classed("x axis", true);
        g.attr("transform", "translate(0," + height + ")").call(xAxis);
        g.selectAll("text")
            .attr("x", -10)
            .attr("dy", ".5em")
            .attr("transform", "rotate(-30)");

        // y-axis
        var mappingTexts = attributeMappings.map(function(d) { return d.name; });
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
        g2.attr("transform", "translate(16,0) rotate(-90)").call(yLabel);
    }

    function updateDotText() {
        chart.selectAll("g.ivs-barChart-bar").each(function() {
            if (d3.select(this).classed("selected")) {
                d3.select(this).moveToFront();
                d3.select(this).select(".name").style("fill", "black");
            } else {
                d3.select(this).select(".name").style("fill", "none");
            }
        });
    }
    
    /**
     * Sets/Gets the index in the attribute mappings of y-value.
     */
    module.yIndex = function(value) {
        if (!arguments.length) return yIndex;
        yIndex = value;
        return this;
    };

    /**
     * Returns the name of visualisation.
     */
    module.visType = function() {
        return "barChart";
    };

    return module;
};