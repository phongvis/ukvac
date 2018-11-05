/**
 * wordCloud module provides a wordle representation of texts by using Jason Davies' cloud layout.
 * Source: http://www.jasondavies.com/wordcloud/#http%3A%2F%2Fwww.jasondavies.com%2Fwordtree%2Fcat-in-the-hat.txt
 */
ivs.vises.wordCloud = function() {
    // Base
    var module = ivs.vises.baseVis().className("ivs-wordCloud");
    var width, height, container, data;

    var margin = { top: 0, right: 0, bottom: 0, left: 0 }, // The margin of the core chart
        cScale = d3.scale.linear().range(ivs.colorMap), // For color-coded nodes
        fontScale = d3.scale.linear().range([16, 60]),
        colorDict, // Need to store colors of text beforehand
        cloud, // d3.layout.cloud
        chart, // The g element inside the container, stores the core chart after being transformed by the margin
        textValue = function(d) { return d.name; }, // Text accessor
        sizeValue = function(d) { return d.pubs; }; // Size accessor

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
        buildVis();
    }

    /**
     * Concrete classes modifies this function to create visualisation.
     */
    function buildVis() {
        if (!chart) {
            chart = container.append("g");
            chart.append("rect").classed("background", true).style("opacity", 0);
        }
        chart.attr("transform", "translate(" + (margin.left + width / 2) + "," + (margin.top + height / 2) + ")");
        chart.select("background").attr("width", width).attr("height", height);

        // Update scale
        cScale.domain(d3.extent(data, sizeValue));
        fontScale.domain(d3.extent(data, sizeValue));
        
        // Store colors
        colorDict = {};
        data.forEach(function(d) {
            colorDict[d.name] = cScale(sizeValue.call(this, d));
        });

        cloud = d3.layout.cloud()
            .size([width, height])
            .words(data.map(function(d) { return { text: textValue.call(this, d), size: sizeValue.call(this, d) }; }))
            .padding(5)
            .rotate(0)
            .font("Arial")
            .fontSize(function(d) { return fontScale(d.size); })
            .on("end", draw)
            .start();
    }

    function draw(words) {
        var text = chart.selectAll("text.ivs-cloud-text").data(words);

        // Add name attribute to words so that it can be dragged in a generic mannger
        words.forEach(function(d) { d.name = d.text; });

        // ENTER
        var textEnter = text.enter().append("text").classed("ivs-cloud-text", true)
            .style("font-size", function(d) { return d.size + "px"; })
            .style("font-family", "Arial")
            .style("fill", function(d) { return colorDict[d.text]; })
            .attr("text-anchor", "middle")
            .attr("transform", function(d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
            .text(function(d) { return d.text; });

        // EXIT
        text.exit().remove();

        // Register click event
        module.registerClickEvent(textEnter, key);

        // Update selection, brushing
        module.updateSelectionBrushing(text, key, onSelectionChanged);

        // Register to be brushed
        module.registerBrushedEvent(textEnter, key, onSelectionChanged);

        // Register for dragging items
        module.registerDragEvent(textEnter);

        // Register for deselection when clicking on empty space
        module.registerDeselection(container, textEnter);
    }

    function onSelectionChanged() {
        chart.selectAll("text.ivs-cloud-text").each(function(d) {
            if (d3.select(this).classed("selected")) {
                d3.select(this).style("fill", "crimson");
            } else {
                d3.select(this).style("fill", colorDict[d.name]);
            }
        });
    }
    
    /**
     * Returns the name of visualisation.
     */
    module.visType = function() {
        return "wordCloud";
    };

    return module;
};