/**
 * This file needs to be loaded first so that the global object "ivs" is created. All modules are then added to "ivs".
 * This file also stores application-scope settings and functions. 
 */
var ivs = function() {
    var ivs = { version: "0.1", errorMessage: "" };
    ivs.notesDict = {};
    ivs.viewedArticlesDict = {};
    ivs.apps = {};
    ivs.data = {};
    ivs.helpers = {};
    ivs.vises = {};
    ivs.widgets = {};
    ivs.colorMap = ["#33CEFF", "#1979AF"];

    ivs.TRANSITION_SHOW_HIDE = 250;
    ivs.TRANSITION_MOVEMENT = 750;
    ivs.HOLD_TO_RENAME_DURATION = 1000;
    ivs.THUMBNAIL_RATIO = 0.2;
    ivs.INFO_PANEL_HEIGHT = 28;

    /**
     * Initialises application-scope settings and functions.
     */
    ivs.init = function() {
        createErrorMessage();
        createPlusIcon();
        createCloneIcon();
        createSearchIcon();
        createDragGhost();
        createMergeIcon();
    };

    function createErrorMessage() {
        ivs.errorMessageContainer = d3.select("body").append("div");
    }

    function createPlusIcon() {
    	var r = 16;

    	ivs.plusIcon = d3.select("svg").append("g").classed("ivs-plus-icon", true).style("opacity", 0);
    	ivs.plusIcon.append("circle")
            .attr("r", r);
        ivs.plusIcon.append("line")
            .attr("x1", 5 - r)
            .attr("y1", 0)
            .attr("x2", r - 5)
            .attr("y2", 0);
        ivs.plusIcon.append("line")
            .attr("x1", 0)
            .attr("y1", 5 - r)
            .attr("x2", 0)
            .attr("y2", r - 5);
    }

    function createCloneIcon() {
        ivs.cloneIcon = d3.select("svg").append("image")
            .attr("xlink:href", "../data/clone.png")
            .attr("x", -16)
            .attr("y", -32)
            .attr("width", 32)
            .attr("height", 32)
            .style("opacity", 0);
    }

    function createSearchIcon() {
        ivs.searchIcon = d3.select("svg").append("image")
            .attr("xlink:href", "../data/search.png")
            .attr("x", -16)
            .attr("y", -16)
            .attr("width", 32)
            .attr("height", 32)
            .style("opacity", 0);
    }

    function createDragGhost() {
        ivs.dragGhost = d3.select("svg").append("text")
            .classed("ivs-ghost", true)
            .style("opacity", 0);
    }

    function createMergeIcon() {
        var r = 12;

        ivs.mergeIcon = d3.select("svg").append("g").classed("ivs-merge-icon", true).style("opacity", 0);
        ivs.mergeIcon.append("circle")
            .attr("r", r);
        ivs.mergeIcon.append("line")
            .attr("x1", 5 - r)
            .attr("y1", 0)
            .attr("x2", r - 5)
            .attr("y2", 0);
        ivs.mergeIcon.append("line")
            .attr("x1", 0)
            .attr("y1", 5 - r)
            .attr("x2", 0)
            .attr("y2", r - 5);
    }

    /**
     * Displays an error message.
     */
    ivs.updateErrorMessage = function(title, text) {
        ivs.errorMessageContainer.datum({ title: title, text: text }).call(ivs.widgets.errorMessage());
    }

    /**
     * Updates visibility and position of the feedback plus icon.
     */
    ivs.updatePlusIcon = function(visibility, x, y) {
    	ivs.plusIcon
            .style("opacity", visibility)
    		.attr("transform", "translate(" + x + "," + y + ")");
    };

    /**
     * Updates visibility and position of the feedback clone icon.
     */
    ivs.updateCloneIcon = function(visibility, x, y) {
        ivs.cloneIcon
            .style("opacity", visibility)
            .attr("transform", "translate(" + x + "," + y + ")");
    };

    /**
     * Updates visibility and position of the feedback search icon.
     */
    ivs.updateSearchIcon = function(visibility, x, y) {
        ivs.searchIcon
            .style("opacity", visibility)
            .attr("transform", "translate(" + x + "," + y + ")");
    };

    /**
     * Updates visibility and position of the ghost.
     */
    ivs.updateDragGhost = function(visibility, x, y, texts) {
        ivs.dragGhost
            .style("opacity", visibility)
            .attr("transform", "translate(" + x + "," + (y + 20) + ")")
            .style("cursor", "default");

        if (visibility) {
            ivs.dragGhost.selectAll("tspan").remove();
            texts.forEach(function(d) {
                ivs.dragGhost.append("tspan").text(d).attr("x", 0).attr("dy", "1em");
            });
        }
    };

    /**
     * Updates visibility and position of the feedback merge icon.
     */
    ivs.updateMergeIcon = function(visibility, x, y) {
        ivs.mergeIcon
            .style("opacity", visibility)
            .attr("transform", "translate(" + x + "," + y + ")");
    };

    return ivs;
}();