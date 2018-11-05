/**
 * graph module provides a network representation (node-link) by using D3's force layout.
 * Data structure: each node has a unique name. 
 * Links have source, target, value atrributes.
 * Source: http://bl.ocks.org/mbostock/4062045
 */
ivs.vises.graph = function() {
    // Base
    var module = ivs.vises.baseVis().className("ivs-graph");
    var width, height, container, data;

    var DOT_SIZE = 24,
        margin = { top: 0, right: 0, bottom: 0, left: 0 }, // The margin of the core chart
        originalData,
        dScale = d3.scale.linear(), // Distance scale
        force, // d3.layout.force
        brush,
        chart; // The g element inside the container, stores the core chart after being transformed by the margin

    var profilePictures = { // For nice demonstration
        "Ben Shneiderman" : "http://academic.research.microsoft.com/Photo/899177.jpg",
        "Catherine Plaisant": "http://academic.research.microsoft.com/Photo/111324.jpg",
        "Christopher Ahlberg": "http://academic.research.microsoft.com/Photo/1291815.jpg",
        "Batya Friedman": "http://academic.research.microsoft.com/Photo/1485457.jpg",
        "Stuart K. Card": "http://academic.research.microsoft.com/Photo/1656477.jpg",
        "George G. Robertson": "http://academic.research.microsoft.com/Photo/361485.jpg",
        "Peter Pirolli": "http://academic.research.microsoft.com/Photo/1511322.jpg",
        "Ramana Rao": "http://academic.research.microsoft.com/Photo/2262248.jpg",
        "Jock D. Mackinlay": "http://academic.research.microsoft.com/Photo/484075.jpg"
    }
    // Default key 'name' to allow object-constancy when binding. 
    var key = function(d) {
        return d.name;
    };
    var linkKey = function(d) {
        return d.source.name + "#" + d.target.name;
    }

    /**
    * Overrides the visualisation creation method.
    */
    module.buildVis = function() {
        // Retrieve properties from the base.
        container = this.container();
        data = ivs.helpers.basic.deepCopy(this.data()); // Because the layout will modify the data
        originalData = ivs.helpers.basic.deepCopy(this.data());
        width = this.width() - margin.left - margin.right ;
        height = this.height() - margin.top - margin.bottom;

        buildVis();
    }

    /**
     * Concrete classes modifies this function to create visualisation.
     */
    function buildVis() {
        if (!chart) {
            chart = container.append("g");
        }
        chart.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        dScale.domain([0, d3.max(data.links, function(d) { return d.value; })])
            .range([height / 2, DOT_SIZE * 2.5]);

        force = d3.layout.force()
            .charge(-120)
            .linkDistance(function(link, index) {
                return dScale(data.links[index].value);
            }).size([width, height]);
        
        force.nodes(data.nodes)
            .links(data.links)
            .start();

        var link = chart.selectAll(".link")
            .data(data.links, linkKey)
            .enter().append("line")
                .attr("class", "ivs-graph-link")
                .style("stroke-width", function(d) { return Math.sqrt(d.value); });

        // Brush: should be placed below dots to make dots clickable, but on top of links
        if (!brush) {
            brush = chart.append("g")
                .datum(function() { return { selected: false, previouslySelected: false}; })
                .attr("class", "brush");
        }
        brush.call(d3.svg.brush()
            .x(d3.scale.identity().domain([0, width]))
            .y(d3.scale.identity().domain([0, height]))
            .on("brushstart", function(d) {
                chart.selectAll(".ivs-graph-node").each(function(d) { d.previouslySelected = d3.event.sourceEvent.ctrlKey && d.selected; });
            }).on("brush", function() {
                var extent = d3.event.target.extent();
                chart.selectAll(".ivs-graph-node").classed("selected", function(d) {
                    d.selected = d.previouslySelected ^ (extent[0][0] <= d.x && d.x < extent[1][0] && extent[0][1] <= d.y && d.y < extent[1][1]);
                    d3.select(this).select(".name").style("opacity", d.selected ? 1 : 0);

                    return d.selected;
                });
            }).on("brushend", function() {
                d3.event.target.clear();
                d3.select(this).call(d3.event.target);
            }));

        var nodes = chart.selectAll("g.ivs-graph-node").data(data.nodes, key);
        var newNodes = nodes.enter().append("g").attr("class", "ivs-graph-node");

        newNodes.append("image")
            .attr("xlink:href", function(d) { // Some manually added pictures for demo
                if (profilePictures[d.name]) {
                    return profilePictures[d.name];
                } else {
                    return "http://academic.research.microsoft.com/Images/photo-mix.jpg";
                }
            }).attr("x", -DOT_SIZE)
            .attr("y", -DOT_SIZE)
            .attr("width", DOT_SIZE * 2)
            .attr("height", DOT_SIZE * 2);

        newNodes.each(function(d) {
            d3.select(this).append("clipPath")
                .attr("id", function(d) { return encodeURI(d.name); })
                .append("circle")
                    .attr("r", DOT_SIZE);
            d3.select(this).select("image").attr("clip-path", "url(#" + encodeURI(d.name) + ")");
        });

        // Click on void space to deselect everything
        chart.on("click", function() {
            if (d3.event.defaultPrevented) { return; } // Prevent triggering by dragging

            var overDot = false;
            dots.each(function() {
                if (d3.select(this).node().containsPoint({ x: d3.event.pageX, y: d3.event.pageY })) {
                    overDot = true;
                }
            });

            if (!overDot) {
                ivs.app.selectionManager.setSelected(module.activeMapping(), []);
            }
        });

        var circles = newNodes.append("circle")
            .attr("r", DOT_SIZE)
            .style("fill-opacity", 0);

        // circles.on("click", function(d) {
        //     if (d3.event.altKey) { return; } // Pan

        //     if (d3.event.ctrlKey) {
        //         var parent = d3.select(this.parentNode);
        //         parent.classed("selected", d.selected = !d.selected);
        //         parent.select(".name").style("opacity", d.selected ? 1 : 0);
        //     } else {
        //         chart.selectAll(".ivs-graph-node").classed("selected", function(p) { 
        //             p.selected = d === p;
        //             if (p.selected) {
        //                 d3.select(this).moveToFront();
        //             }

        //             d3.select(this).select(".name").style("opacity", p.selected ? 1 : 0);

        //             return p.selected; 
        //         });
        //     }
        // });
        circles.append("title")
            .text(function(d, i) { return d.name + (i > 0 ? (": " + data.links[i - 1].value) + " articles co-authored": ""); });
        
        newNodes.append("text")
            .classed("name", true)
            .attr("y", DOT_SIZE)
            .attr("dy", "1em")
            .style("opacity", 0)
            .text(function(d) { return d.name; });

        force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            // Try to put the graph inside boundary
            // chart.style("opacity", force.alpha() > 0.075 ? 0 : 1);
            // newNodes.attr("transform", function(d) { return "translate(" + Math.max(DOT_SIZE, Math.min(width - DOT_SIZE, d.x)) + "," + Math.max(DOT_SIZE, Math.min(height - DOT_SIZE, d.y)) + ")"; });

            newNodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        });

        // Register click event
        module.registerClickEvent(newNodes, key);

        // Update selection, brushing
        module.updateSelectionBrushing(nodes, key, updateDotText);

        // Register to be brushed
        module.registerBrushedEvent(nodes, key, updateDotText);

        // Register for dragging items
        module.registerDragEvent(newNodes);

        // Register for deselection when clicking on empty space
        module.registerDeselection(chart, newNodes);
    }

    function updateDotText() {
        chart.selectAll("g.ivs-graph-node").each(function() {
            if (d3.select(this).classed("selected")) {
                d3.select(this).moveToFront();
                d3.select(this).select(".name").style("opacity", 1);
            } else {
                d3.select(this).select(".name").style("opacity", 0);
            }
        });
    }
    
    /**
     * Gets the backing data of the visualisation. 
     */
    module.originalData = function() {
        return originalData;
    };

    /**
     * Returns the name of visualisation.
     */
    module.visType = function() {
        return "graph";
    };

    return module;
};