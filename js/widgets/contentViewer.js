/**
 * contentViewer module provides handy features to read document's contents: copy/paste, search, highlight, comment. 
 */
ivs.widgets.contentViewer = function() {
    var dispatch = d3.dispatch("documentClosed");
    var dialogWidth = 600,
        minDialogHeight = 300; 
    
    /**
     * Main entry of the module.
     * Note that only the first selected element can be created because variables are shared across selection.
     */
    function module(selection) {
        selection.each(function(d) {
        	// Dialog
        	var container = $("<div></div>").appendTo(this);
        	container.attr("title", d.title)
        	   .dialog({
            		width: dialogWidth,
            		minHeight: minDialogHeight,
        			close: function(e) {
        				e.notes = noteBox.val();
        				dispatch.documentClosed(e);
        				container.remove();
        			},
        			show: {effect: 'fade', duration: ivs.TRANSITION_SHOW_HIDE},
                    hide: {effect: 'fade', duration: ivs.TRANSITION_SHOW_HIDE}
        		});
    		
    		// Toolbar	
        	var toolbarDiv = $("<div class='ivs-contentViewer-toolbar'></div>").appendTo(container);
        	var searchBox = $("<input type='search' placeholder='Search' incremental='true' class='ivs-contentViewer-searchBox'></input>").appendTo(toolbarDiv);
        	
        	var highlightSearchTerm = function() {
        		textDiv.highlight(searchBox.val(), 'ivs-contentViewer-highlight');
        	};
        	
        	// searchBox.val(d.searchWord)
    	   searchBox.on("search", function() {
        		highlightSearchTerm();
        	});
        	
        	var noteBox = $("<textarea class='ivs-contentViewer-noteBox' placeholder='Type your notes here...'></textarea").appendTo(toolbarDiv).val(d.notes);
    
    		// Content box
        	var textDiv = $("<div class='ivs-contentViewer-content'></div>").appendTo(container);
            $("<h4 style='margin-bottom: 2px'>Abstract</h4>").appendTo(textDiv);
            $("<div></div>").appendTo(textDiv).html(d.abstract);
            $("<h4 style='margin-bottom: 2px'>References</h4>").appendTo(textDiv);
            var ref = d.references.replace(/\n/g, "<br/>");
            $("<div style='font-size:0.8em'></div>").appendTo(textDiv).html(ref);
    
        	// highlightSearchTerm();
        });
	} 

    // Binds custom events
    d3.rebind(module, dispatch, "on");
	
   	return module;
};