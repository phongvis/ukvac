/**
 * errorMessage module provides an error message dialog.
 */
ivs.widgets.errorMessage = function() {
    var dialogWidth = 400,
        minDialogHeight = 200; 
    
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
        			show: {effect: 'fade', duration: ivs.TRANSITION_SHOW_HIDE},
                    hide: {effect: 'fade', duration: ivs.TRANSITION_SHOW_HIDE}
        		});
    		
    		// Content box
        	var textDiv = $("<div>" + d.text + "</div>").appendTo(container);
        });
	} 

   	return module;
};