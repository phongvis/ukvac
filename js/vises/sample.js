/**
 * sample module shows an example of overriding the baseVis to create a custom visualisation.
 * It displays "AWESOME VIS" in the centre of its drawing area.
 * It also displays some circles based on the input as the array of {x, y, size, id}.
 * It dispatches an event when a circle is clicked.
 */
ivs.vises.sample = function() {
    // Base
    var module = ivs.vises.baseVis();
    var width, height, container, data;

    var xScale = d3.scale.linear(), // d3.scale of x-value
        yScale = d3.scale.linear(); // d3.scale of y-value
    
    var dispatch = d3.dispatch("itemClicked");
    
    // Each data item needs to have an ID to allow object-constancy when binding. 
    var key = function(d) {
        return d.id;
    };
    
    /**
     * Overrides the visualisation creation method.
     */
    module.buildVis = function() {
        // Retrieve properties from the base.
        container = this.container();
        data = this.data();
        width = this.width();
        height = this.height();

        buildVis();
    }

    /**
     * Concrete classes modifies this function to create visualisation.
     */
    function buildVis() {
        // Update the x-scale
        xScale
            .domain([0, 1])
            .range([0, width]);

        // Update the y-scale
        yScale
            .domain([0, 1])
            .range([height, 0]); // y-axis goes from the bottom

        // Say hello
        var text = container.selectAll("text.ivs-sample-text").data([0]);
        text.enter().append("text").classed("ivs-sample-text", true);
        text.attr("x", width / 2)
            .attr("y", height / 2)
            .text("AWESOME VIS");
            
        // Circles: Apply update pattern to allow object-constancy
        var circles = container.selectAll("circle.ivs-sample-circle").data(data, key);
        
        // - ENTER: Add a skeletal circle and fixed attributes
        circles.enter().append("circle").classed("ivs-sample-circle", true)
            .attr("cx", function(d) { return xScale(d.x); })
            .attr("cy", function(d) { return yScale(d.y); })
            .style("fill", "steelblue")
            .style("opacity", 0)
            .attr("r", 0)
            .on("click", function(d) {
                dispatch.itemClicked(d);
            })
            .transition()
            .attr("r", function(d) { return d.size; })
            .style("opacity", 0.8);
        
        // - UPDATE
        
        // - EXIT
        circles.exit()
            .transition()
            .style("opacity", 0)
            .remove();
    }

    // Caller can listen to the dispatched events by using "on".
    d3.rebind(module, dispatch, "on");

    return module;
};