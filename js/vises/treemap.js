/**
 * treemap module provides a tree-map representation of hierarchical data by using D3's treemap layout.
 * Data structure: each node has a unique name. 
 * Leaf nodes have a 'size' attribute. Non-leaf nodes have a 'children' attribute, which contains an array of nodes.
 * Source: http://mbostock.github.io/d3/talk/20111018/treemap.html
 */
ivs.vises.treemap = function() {
    // Base
    var module = ivs.vises.baseVis().className("ivs-treemap");
    var width, height, container, data, attributeMappings;

    var CELL_PADDING = 3,
        margin = { top: 0, right: 0, bottom: 25, left: 0 }, // The margin of the core chart
        originalData,
        xScale = d3.scale.linear(), // d3.scale of x-value
        yScale = d3.scale.linear(), // d3.scale of y-value
        cScale = d3.scale.linear().range(ivs.colorMap), // For color-coded nodes
        treemap, // d3.layout.treemap
        sizeLabel, // label for axis
        chart, // The g element inside the container, stores the core chart after being transformed by the margin
        clipPath, // To prevent zooming outside the chart area
        brush,
        sizeIndex = 0, // Index of size-value in attribute mappings
        sizeValue, // Size accessor
        sizeName; // Size display name

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
        data = ivs.helpers.basic.deepCopy(this.data()); // Because the layout will modify the data
        originalData = ivs.helpers.basic.deepCopy(this.data());
        width = this.width() - margin.left - margin.right ;
        height = this.height() - margin.top - margin.bottom;
        attributeMappings = this.attributeMappings();

        mapAttributes();
        buildVis();
    }

    /**
     * Maps attributes to their visual encodings.
     */
    function mapAttributes() {
        sizeValue = attributeMappings[sizeIndex].value;
        sizeName = attributeMappings[sizeIndex].name;
    }
    
    /**
     * Concrete classes modifies this function to create visualisation.
     */
    function buildVis() {
        if (!chart) {
            chart = container.append("g");
            chart.append("rect").classed("background", true).style("opacity", 0);
        }
        chart.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        chart.select("background").attr("width", width).attr("height", height);

        // Update scale
        xScale.range([0, width]);
        yScale.range([0, height]);

        treemap = d3.layout.treemap()
            .size([width, height])
            .round(true)
            .sticky(true)
            .value(sizeValue);
        
        node = root = data;
        var nodes = treemap.nodes(root)
            .filter(function(d) { return !d.children; });

        // Update color scale
        cScale.domain(d3.extent(nodes, function(d) { return d.cites; }));

        var cells = chart.selectAll("g.cell").data(nodes, key);

        // ENTER
        var cell = cells.enter().append("g")
            .attr("class", "cell");

        cell.append("rect")
            .style("fill", function(d) { return cScale(d.cites); });

        cell.append("foreignObject")
            .classed("ivs-treemap-fo", true)
                .append("xhtml:span")
                .classed("ivs-treemap-text", true)
                .text(function(d) { return d.name; });

        // Tooltip for all cells
        cell.append("title")
            .text(function(d) { return d.name + " has " + sizeValue.call(this, d) + " articles"; });

        // UPDATE
        cells.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })

        cells.select("rect")
            .attr("width", function(d) { return d.dx - 1; })
            .attr("height", function(d) { return d.dy - 1; });
        
        cells.select(".ivs-treemap-text")
            .style("opacity", function(d) { 
                d3.select(this).style("font-size", "1em");
                var rect = this.getBoundingClientRect();
                d.w = rect.width;
                d.h = rect.height;
                var opacity = d.dx * module.scale() - CELL_PADDING * 2 > d.w && d.dy * module.scale() - CELL_PADDING * 2 > d.h ? 1 : 0; 
                
                // Try smaller font size for long text
                if (opacity === 0) {
                    d3.select(this).style("font-size", "0.9em");
                    rect = this.getBoundingClientRect();
                    d.w = rect.width;
                    d.h = rect.height;
                    opacity = d.dx * module.scale() - CELL_PADDING * 2 > d.w && d.dy * module.scale() - CELL_PADDING * 2 > d.h ? 1 : 0;

                    if (opacity === 0) {
                        d3.select(this).style("font-size", "0.8em");
                        rect = this.getBoundingClientRect();
                        d.w = rect.width;
                        d.h = rect.height;
                        opacity = d.dx * module.scale() - CELL_PADDING * 2 > d.w && d.dy * module.scale() - CELL_PADDING * 2 > d.h ? 1 : 0;
                    }
                }                

                return opacity;
            });
        
        cells.select(".ivs-treemap-fo")
            .attr("transform", function(d) { 
                var rect = d3.select(this).select(".ivs-treemap-text").node().getBoundingClientRect();
                return "translate(" + CELL_PADDING + "," + ((d.dy - rect.height) / 2) + ")"; 
            }).attr("width", function(d) { return d.dx - CELL_PADDING * 2; })
            .attr("height", function(d) { return d.dy - CELL_PADDING * 2; });

        // Brush
        if (!brush) {
            brush = chart.append("g")
                .datum(function() { return { selected: false, previouslySelected: false}; })
                .attr("class", "brush");

            // Work-around for brushing on top of cells. A bit annoying: need an extra click when changing between click and brush
            chart.on("mousedown", function() {
                if (d3.event.shiftKey) {
                    brush.style("pointer-events", "all");
                } else {
                    brush.style("pointer-events", "none");
                }
            });
        }
        brush.call(d3.svg.brush()
            .x(d3.scale.identity().domain([0, width]))
            .y(d3.scale.identity().domain([0, height]))
            .on("brushstart", function(d) {
                cells.each(function(d) { d.previouslySelected = d3.event.sourceEvent.ctrlKey && d.selected; });
            }).on("brush", function() {
                var extent = d3.event.target.extent();
                var extentRect = { left: extent[0][0], right: extent[1][0], top: extent[0][1], bottom: extent[1][1] };
                cells.classed("selected", function(d) {
                    var rect = { left: d.x, right: d.x + d.dx, top: d.y, bottom: d.y + d.dy };
                    var intersected = ivs.helpers.d3.isIntersected(extentRect, rect);
                    d.selected = d.previouslySelected ^ intersected;

                    return d.selected;
                });
                module.setSelected(cells, key);
            }).on("brushend", function() {
                d3.event.target.clear();
                d3.select(this).call(d3.event.target);
            }));

        brush.style("pointer-events", "none");

        // Register click event
        module.registerClickEvent(cells, key);

        // Update selection, brushing
        module.updateSelectionBrushing(cells, key);

        // Register to be brushed
        module.registerBrushedEvent(cells, key);

        // Register for dragging items
        module.registerDragEvent(cells);

        // Register for deselection when clicking on empty space
        module.registerDeselection(container, cells);

        // EXIT
        cells.exit().remove();

        // Clip-path to prevent zooming outside the area
        // if (!clipPath) {
        //     clipPath = chart.append("clipPath").attr("id", "treemap-area").append("rect");
        //     chart.attr("clip-path", "url(#treemap-area)");
        // }
        // clipPath.attr("width", width).attr("height", height);

        // Size label
        var mappingTexts = attributeMappings.map(function(d) { return d.name; });
        if (!sizeLabel) {
            sizeLabel = ivs.widgets.cycleButton().className("ivs-treemap-cycleButton")
                .on("indexChanged", function(index) {
                    sizeIndex = index;
                    mapAttributes();
                    treemap.value(sizeValue).nodes(root);
                    node = zoom(node);
                });
        }
        sizeLabel.texts(mappingTexts).currentIndex(sizeIndex);
        var g = chart.selectAll(".label").data([0]);
        g.enter().append("g").classed("label", true).style("text-anchor", "middle");
        g.attr("transform", "translate(" + width / 2 + "," + (height + 14) + ")").call(sizeLabel);

        zoom(node);
    }
    
    function zoom(d) {
        var kx = width / d.dx, ky = height / d.dy;
        xScale.domain([d.x, d.x + d.dx]);
        yScale.domain([d.y, d.y + d.dy]);

        var t = chart.selectAll("g.cell").transition()
            .duration(ivs.TRANSITION_MOVEMENT)
            .attr("transform", function(d) { return "translate(" + xScale(d.x) + "," + yScale(d.y) + ")"; });

        t.select("rect")
            .attr("width", function(d) { return kx * d.dx - 1; })
            .attr("height", function(d) { return ky * d.dy - 1; });

        chart.selectAll("g.cell").select(".ivs-treemap-text")
            .style("opacity", function(d) { 
                d3.select(this).style("font-size", "1em");
                var rect = this.getBoundingClientRect();
                d.w = rect.width;
                d.h = rect.height;
                var opacity = d.dx * module.scale() - CELL_PADDING * 2 > d.w && d.dy * module.scale() - CELL_PADDING * 2 > d.h ? 1 : 0; 
                
                // Try smaller font size for long text
                if (opacity === 0) {
                    d3.select(this).style("font-size", "0.9em");
                    rect = this.getBoundingClientRect();
                    d.w = rect.width;
                    d.h = rect.height;
                    opacity = d.dx * module.scale() - CELL_PADDING * 2 > d.w && d.dy * module.scale() - CELL_PADDING * 2 > d.h ? 1 : 0;

                    if (opacity === 0) {
                        d3.select(this).style("font-size", "0.8em");
                        rect = this.getBoundingClientRect();
                        d.w = rect.width;
                        d.h = rect.height;
                        opacity = d.dx * module.scale() - CELL_PADDING * 2 > d.w && d.dy * module.scale() - CELL_PADDING * 2 > d.h ? 1 : 0;
                    }
                }                

                return opacity;
            });
        
        chart.selectAll("g.cell").select(".ivs-treemap-fo")
            .attr("transform", function(d) { 
                var rect = d3.select(this).select(".ivs-treemap-text").node().getBoundingClientRect();
                return "translate(" + CELL_PADDING + "," + ((d.dy - rect.height) / 2) + ")"; 
            }).attr("width", function(d) { return d.dx - CELL_PADDING * 2; })
            .attr("height", function(d) { return d.dy - CELL_PADDING * 2; });

        if (d3.event && d3.event.stopPropagation) {
            d3.event.stopPropagation();
        }
  
        return d;
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
        return "treemap";
    };

    return module;
};