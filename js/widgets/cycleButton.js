/**
 * cycleButton provides a cycle button, which allows clicking to move to next option cyclically.
 */
ivs.widgets.cycleButton = function() {
    var texts = [],
        className = "ivs-cycleButton",
        container,
        currentIndex = 0,
        maxWidth;

    var dispatch = d3.dispatch("indexChanged");

    /**
     * Main entry of the module. This will be invoked by selection.call(template).
     * Note that only the first selected element can be created because variables are shared across selection.
     */
    function module(selection) {
        selection.each(function() {
            if (!container) {
                container = d3.select(this).append("g");
            }
            if (className) { 
                container.classed(className, true);
            }

            buildVis();
        });
    }

    /**
     * Build the visualisation. 
     */
    function buildVis() {
        // Rounded rectangular background
        var rect = container.selectAll("rect").data([0]);
        rect.enter().append("rect");
        rect.attr("rx", 8)
            .attr("ry", 8)
            .style("opacity", 0);

        // Text
        var text = container.selectAll("text").data([0]);
        text.enter().append("text");
        text.text(getText(text));

        // Update background dimension
        var box = text.node().getBBox();
        rect.attr("x", text.style("text-anchor") === "start" ? -4 : text.style("text-anchor") === "end" ? -4 - box.width : -4 - box.width / 2)
            .attr("y", -box.height + 1)
            .attr("width", box.width + 8)
            .attr("height", box.height + 3);

        // Mouseover
        container.on("mousemove", function () {
            container.select("rect").style("opacity", 1);
            if (texts && texts.length > 1) {
                container.style("cursor", "pointer");
            }
        }).on("mouseout", function() {
            container.select("rect").style("opacity", 0);
            container.style("cursor", "default");
        }).on("click", function() {
            if (texts && texts.length > 1) {
                var text = container.select("text");
                currentIndex = (currentIndex + 1) % texts.length;
                text.text(getText(text));
                dispatch.indexChanged(currentIndex);

                // Update button width
                var box = text.node().getBBox();
                container.select("rect")
                    .attr("x", text.style("text-anchor") === "start" ? -4 : text.style("text-anchor") === "end" ? -4 - box.width : -4 - box.width / 2)
                    .attr("width", box.width + 8);
            }
        });
    }

    function getText(text) {
        if (!texts || !texts.length) {
            return "";
        }

        if (maxWidth) {
            var textElement = text.node();
            textElement.textContent = texts[currentIndex];
            if (textElement.getComputedTextLength() < maxWidth) {
                return texts[currentIndex];
            }
                
            // Ignore last ...
            var numChars = texts[currentIndex].length;
            textElement.textContent += "...";
            var dotsWidth = textElement.getSubStringLength(numChars, 3);
            allowWidth = maxWidth - dotsWidth;
            
            // Find the limit position
            var limitPosition = 0;
            
            for (var i = 0; i < numChars; i++) {
                if (textElement.getSubStringLength(0, i + 1) > allowWidth) {
                    limitPosition = i;
                    break;
                }
            }
            
            return textElement.textContent.substring(0, limitPosition) + "...";
        } else {
            return texts[currentIndex];
        }
    }

    /**
     * Sets/Gets the texts of the button. 
     */
    module.texts = function(value) {
        if (!arguments.length) return texts;
        texts = value;
        return this;
    };
    
    /**
     * Sets/Gets the className of the button. 
     */
    module.className = function(value) {
        if (!arguments.length) return className;
        className = value;
        return this;
    };

    /**
     * Sets/Gets the current index of the cycle texts.
     */
    module.currentIndex = function(value) {
        if (!arguments.length) return currentIndex;
        currentIndex = value;
        return this;
    };

    /**
     * Sets/Gets the maximum width of the button. 
     */
    module.maxWidth = function(value) {
        if (!arguments.length) return maxWidth;
        maxWidth = value;
        return this;
    };

    // Caller can listen to the dispatched events by using "on".
    d3.rebind(module, dispatch, "on");
    
    return module;
};