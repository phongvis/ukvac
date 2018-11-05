
/**
 * toolbar module provides a range of data sources and visualisation types.
 * Data input: { name, imagePath }
 */
ivs.vises.toolbar = function() {
     // Base
    var module = ivs.vises.baseVis().className("ivs-toolbar").zoomPan(false).infoPanel(false);
    var width, height, container, data;
    
    var imageSize, // The size of the squared image
        padding = 5; // The padding between image and border

    var dispatch = d3.dispatch("dataVisTypeDropped", "visTypeOnlyDragged", "visTypeOnlyDropped");    

    /**
    * Overrides the visualisation creation method.
    */
    module.buildVis = function() {
        // Retrieve properties from the base.
        container = this.container();
        data = this.data();
        width = this.width();
        height = this.height();
        imageSize = height - padding * 4;

        buildVis();
    }

    /**
     * Concrete classes modifies this function to create visualisation.
     */
    function buildVis() {
        buildVisTypes();
        buildDataSources();
    }

    function buildDataSources() {
		// Data sources as images
        var blocks = container.selectAll("g.dataSource").data(data[0]);

        // Left side
        var getX = function(i) {
            return i * height + padding + 20;
        };

        blocks.enter().append("g").classed("dataSource", true)
            .attr("transform", function(d, i) { return "translate(" + getX(i) + "," + padding + ")"; } );

        // - Border
        blocks.append("rect")
            .classed("ivs-toolbar-vistype", true)
            .attr("rx", padding * 10)
            .attr("ry", padding * 4)
            .attr("width", imageSize + padding * 2)
            .attr("height", imageSize + padding * 2);
        blocks.append("rect")
            .classed("ivs-toolbar-vistype", true)
            .attr("rx", padding * 10)
            .attr("ry", padding * 4)
            .attr("width", imageSize + padding * 2)
            .attr("height", padding * 8);
        // - Image
        blocks.append("image")
            .attr("x", padding * 2)
            .attr("y", padding * 4)
            .attr("width", imageSize - padding * 2)
            .attr("height", imageSize - padding * 2)
            .attr("xlink:href", function(d) { return d.imagePath; });
        // Ghost for dragging
        var g = blocks.append("g").style("opacity", 0);
        g.append("rect")
            .classed("ivs-toolbar-vistype", true)
            .attr("rx", padding * 10)
            .attr("ry", padding * 4)
            .attr("width", imageSize + padding * 2)
            .attr("height", imageSize + padding * 2);
        g.append("rect")
            .classed("ivs-toolbar-vistype", true)
            .attr("rx", padding * 10)
            .attr("ry", padding * 4)
            .attr("width", imageSize + padding * 2)
            .attr("height", padding * 8);
        g.append("image")
            .attr("x", padding * 2)
            .attr("y", padding * 4)
            .attr("width", imageSize - padding * 2)
            .attr("height", imageSize - padding * 2)
            .attr("xlink:href", function(d) { return d.imagePath; });

        // Disabled
        blocks.each(function(d, i) {
            if (d.disabled) {
                d3.select(this)
                    .style("pointer-events", "none")
                    .style("fill", "#EEEEEE")
                    .style("stroke", "gray")
                    .append("text")
                        .classed("ivs-toolbar-comingsoon", true)
                        .attr("x", imageSize / 2 + padding)
                        .attr("y", imageSize)
                        .text("COMING SOON");
            } else {
                d3.select(this)
                    .style("pointer-events", "all")
                    .style("fill", "#EEF3FA")
                    .style("stroke", "steelblue");
            }
        });

        // Drag data source
        var self = this;
        var dispatchObject;
        var drag = d3.behavior.drag()
            .on("dragstart", function() { d3.select(this).select("g").style("opacity", 0.5); })
            .on("drag", function(d) {
                // Get current transform
                var t = d3.transform(d3.select(this).select("g").attr("transform")).translate;
                
                // Update the ghost with new offset
                t[0] += d3.event.dx;
                t[1] += d3.event.dy;
                d3.select(this).select("g").attr("transform", "translate(" + t[0] + "," + t[1] + ")");

                d3.select(this).moveToFront();

                // Update feedback icon if hovering a vis type
                dispatchObject = null, pos = { x: 0, y: 0 };
                container.selectAll("g.visType").each(function(d2) {
                    if (dispatchObject || d2.disabled) { return; }
                    if (d2.name !== "treemap" && d2.name !== "tree" && d2.name !== "wordCloud") { return; } // Only treemap, tree, wordCloud can be used for the overview

                    pos = { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY };
                    if (this.containsPoint(pos)) {
                        dispatchObject = { dataSource: d.name, visType: d2.name };
                    }
                });

                ivs.updatePlusIcon(dispatchObject ? 1 : 0, pos.x , pos.y);
            }).on("dragend", function(d) { 
                // Hide ghost
                d3.select(this).select("g").attr("transform", "translate(0,0)").style("opacity", 0);  

                // Dispatch event if drop onto a vis type
                if (dispatchObject) {
                    dispatch.dataVisTypeDropped(dispatchObject);
                }
                dispatchObject = null;

                // Hide feedback icon
                ivs.updatePlusIcon(0);
            });
        blocks.call(drag);

        // Header
        var textContainer = container.append("text")
        	.attr("transform", "translate(20, 120) rotate(270)")
        	.text("DATA")
			.style("text-anchor", "left")
			.style("fill", "green")
			.style("font-size", "1.5em");
    }
    
    function buildVisTypes() {
        // Vis types as images
        var blocks = container.selectAll("g.visType").data(data[1]);

        // Right side
        var getX = function(i) {
            return width - (blocks.size() - i) * height + padding;
        };

        blocks.enter().append("g").classed("visType", true)
            .attr("transform", function(d, i) { return "translate(" + getX(i) + "," + padding + ")"; } );

        // - Border
        blocks.append("rect")
            .classed("ivs-toolbar-vistype", true)
            .attr("rx", padding * 2)
            .attr("ry", padding * 2)
            .attr("width", imageSize + padding * 2)
            .attr("height", imageSize + padding * 2);
        // - Image
        blocks.append("image")
            .attr("x", padding)
            .attr("y", padding)
            .attr("width", imageSize)
            .attr("height", imageSize)
            .attr("xlink:href", function(d) { return d.imagePath; });
        // Ghost for dragging
        var g = blocks.append("g").style("opacity", 0);
        g.append("rect")
            .classed("ivs-toolbar-vistype", true)
            .attr("rx", padding * 2)
            .attr("ry", padding * 2)
            .attr("width", imageSize + padding * 2)
            .attr("height", imageSize + padding * 2);
        g.append("image")
            .attr("x", padding)
            .attr("y", padding)
            .attr("width", imageSize)
            .attr("height", imageSize)
            .attr("xlink:href", function(d) { return d.imagePath; });

        // Disabled
        blocks.each(function(d, i) {
            if (d.disabled) {
                d3.select(this)
                    .style("pointer-events", "none")
                    .style("fill", "#EEEEEE")
                    .style("stroke", "gray")
                    .append("text")
                        .classed("ivs-toolbar-comingsoon", true)
                        .attr("x", imageSize / 2 + padding)
                        .attr("y", imageSize)
                        .text("COMING SOON");
            } else {
                d3.select(this)
                    .style("pointer-events", "all")
                    .style("fill", "#EEF3FA")
                    .style("stroke", "steelblue");
            }
        });

        // Drag vis type
        var self = this;
        var drag = d3.behavior.drag()
            .on("dragstart", function() { 
                d3.select(this).select("g").style("opacity", 0.5);
                d3.select(this).moveToFront();
            }).on("drag", function(d) {
                // Get current transform
                var t = d3.transform(d3.select(this).select("g").attr("transform")).translate;
                // Update the ghost with new offset
                t[0] += d3.event.dx;
                t[1] += d3.event.dy;
                d3.select(this).select("g").attr("transform", "translate(" + t[0] + "," + t[1] + ")");

                dispatch.visTypeOnlyDragged({ pos: { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY }, visType: d.name });
            }).on("dragend", function(d) { 
                // Hide ghost
                d3.select(this).select("g").attr("transform", "translate(0,0)").style("opacity", 0);  

                dispatch.visTypeOnlyDropped({ pos: { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY }, visType: d.name });
            });
        blocks.call(drag);

        // Header
        var textContainer = container.append("text")
        	.attr("transform", "translate(" + (getX(0) - 10) + ", 120) rotate(270)")
        	.text("VISUALIZATION")
			.style("text-anchor", "left")
			.style("fill", "green")
			.style("font-size", "1.15em");
    }

    /**
     * Gets the vis type being mouse hovered.
     */
    module.getHoveredVisType = function(d) {
        var visType,
            pos = d.pos;
        
        container.selectAll("g.visType").each(function(d2) {
            if (visType || d2.disabled) { return; }
            
            var activeMapping = d.dataSource.activeMapping;
            if (activeMapping === "keywords") { 
                if (d2.name !== "scatterPlot" && d2.name !== "barChart") { return; }
            } else if (activeMapping === "authors") {
                if (d2.name !== "wordCloud" && d2.name !== "scatterPlot" && d2.name !== "barChart" && d2.name !== "graph") { return; }
            } else if (activeMapping === "articles") {
                return;
            }

            if (this.containsPoint(pos)) {
                visType = d2.name;
            }
        });

        ivs.updatePlusIcon(visType ? 1 : 0, pos.x , pos.y);

        return visType;
    }

    // Caller can listen to the dispatched events by using "on".
    d3.rebind(module, dispatch, "on");
    
    return module;
};