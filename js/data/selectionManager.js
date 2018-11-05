
/**
 * selectionManager module is responsible for data linking and brushing.
 * When a data item is selected, all relevant items are brushed.
 * For example, author A is selected, his co-authors, his articles, all keywords in his articles are brushed.
 */
ivs.data.selectionManager = function() {
    var dispatch = d3.dispatch("selectionChanged");

    var selectedAuthors = [],
        selectedKeywords = [],
        selectedArticles = [],
        brushedAuthors = [],
        brushedKeywords = [],
        brushedArticles = [];
    
    function module(selection) {
    }

    /**
     * Sets new selected items.
     */
    module.setSelected = function(contentType, values) {
        contentType === "keywords" ? selectedKeywords = values : contentType === "authors" ? selectedAuthors = values : selectedArticles = values;
        var items = [];
        if (selectedKeywords.length) {
            items.push({ "field": "keywords", "values": selectedKeywords });
        }
        if (selectedAuthors.length) {
            items.push({ "field": "authors", "values": selectedAuthors });
        }
        if (selectedArticles.length) {
            items.push({ "field": "articles", "values": selectedArticles });
        }
        
        if (!items.length) {
            brushedKeywords = [];
            brushedAuthors = [];
            brushedArticles = [];

            dispatch.selectionChanged();
        } else {
            ivs.data.dataProvider().brushedData(items)
                .on("brushCompleted", function(data) {
                    brushedKeywords = data.keywords;
                    brushedAuthors = data.authors;
                    brushedArticles = data.articles;

                    dispatch.selectionChanged();
                });
        }
    };

    /**
     * Clears the existing selection.
     */
    module.clearSelection = function() {
        selectedKeywords = [];
        selectedAuthors = [];
        selectedArticles = [];
        brushedKeywords = [];
        brushedAuthors = [];
        brushedArticles = [];

        dispatch.selectionChanged();
    };

    /**
     * Checks if any items are selected.
     */
    module.anySelected = function() {
        return selectedKeywords.length + selectedAuthors.length + selectedArticles.length;
    };

    /**
     * Checks if the given item is selected.
     */
    module.selected = function(contentType, value) {
        var list = contentType === "keywords" ? selectedKeywords : contentType === "authors" ? selectedAuthors : selectedArticles;
        return list.indexOf(value) !== -1;
    };

    /**
     * Checks if the given item is brushed.
     */
    module.brushed = function(contentType, value) {
        var list = contentType === "keywords" ? brushedKeywords : contentType === "authors" ? brushedAuthors : brushedArticles;
        return list.indexOf(value) !== -1;
    };

    // Binds custom events
    d3.rebind(module, dispatch, "on");
    
    return module;        
};
