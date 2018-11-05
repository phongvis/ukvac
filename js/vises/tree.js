/**
 * tree module provides a tree representation of hierarchical data by using D3's tree layout.
 * Data structure: each node has a unique 'name' attribute. 
 * Leaf nodes have a 'size' attribute. Non-leaf nodes have a 'children' attribute, which contains an array of nodes.
 * Source: http://mbostock.github.io/d3/talk/20111018/tree.html
 */
ivs.vises.tree = function() {
    // Base
    var module = ivs.vises.baseVis().className("ivs-tree");
    var width, height, container, data;

    var originalData,
        i = 0,
        tree, // d3.layout.tree
        root,
        diagonal,
        brush; // The brush for item selection

    // Default key 'name' to allow object-constancy when binding. 
    var key = function(d) {
        return d.name;
    };
    
    /**
    * Overrides the visualisation creation method.
    */
    module.buildVis = function() {
        // Retrieve properties from the base.
        container = this.container().append("g"); // Create an inner g to translate the root
        data = ivs.helpers.basic.deepCopy(this.data()); // Because the layout will modify the data
        originalData = ivs.helpers.basic.deepCopy(this.data());
        width = this.width();
        height = this.height();

        buildVis();

        // Translate to make the root inside the canvas
        container.selectAll("g.node").each(function(d) {
            if (!d.parent) { // Root
                var textWidth = d3.select(this).select("text").node().getBBox().width;
                container.attr("transform", "translate(" + (textWidth + 20) + ",0)");
            }
        });
    }
    
    /**
     * Concrete classes modifies this function to create visualisation.
     */
    function buildVis() {
        tree = d3.layout.tree()
            .size([height, width]);
        
        diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

        root = data;
        root.x0 = height / 2;
        root.y0 = 0;

        function collapse(d) {
            if (d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }

        root.children.forEach(collapse);
        update(root);
    }

    function update(source) {
        // Brush: should place before dots so that dots are on top of the brush
        if (!brush) {
            brush = container.append("g")
                .datum(function() { return { selected: false, previouslySelected: false}; })
                .attr("class", "brush")
                .call(d3.svg.brush()
                    .x(d3.scale.identity().domain([0, width]))
                    .y(d3.scale.identity().domain([0, height]))
                    .on("brushstart", function(d) {
                        container.selectAll("g.node").each(function(d) { d.previouslySelected = d3.event.sourceEvent.ctrlKey && d.selected; });
                    })
                    .on("brush", function() {
                        var extent = d3.event.target.extent();
                        container.selectAll("g.node").classed("selected", function(d) {
                            return d.selected = d.previouslySelected ^ (extent[0][0] <= d.y && d.y < extent[1][0] && extent[0][1] <= d.x && d.x < extent[1][1]);
                        });
                        module.setSelected(container.selectAll("g.node"), key);
                    }).on("brushend", function() {
                        d3.event.target.clear();
                        d3.select(this).call(d3.event.target);
                    }));
        }

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) { d.y = d.depth * 180; });

        // Update the nodes…
        var node = container.selectAll("g.node")
            .data(nodes, function(d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
            .on("click", function(d) { 
                if (d3.event.defaultPrevented) { return; }
                click(d); 
            });

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeEnter.append("text")
            .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.name; })
            .style("fill-opacity", 1e-6);

        // Update selection, brushing
        module.updateSelectionBrushing(node, key);

        // Register to be brushed
        module.registerBrushedEvent(node, key);

        // Register for dragging items
        module.registerDragEvent(nodeEnter);

        // Register for deselection when clicking on empty space
        module.registerDeselection(container, node);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(ivs.TRANSITION_MOVEMENT)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

        nodeUpdate.select("circle")
            .attr("r", 4.5)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        nodeUpdate.each(function(d) {
            d3.select(this).style("cursor", d.children || d._children ? "pointer" : "default");
        });

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(ivs.TRANSITION_MOVEMENT)
            .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = container.selectAll("path.link")
            .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
            .duration(ivs.TRANSITION_MOVEMENT)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(ivs.TRANSITION_MOVEMENT)
            .attr("d", function(d) {
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Toggle children on click.
    function click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
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
        return "tree";
    };

    return module;
};