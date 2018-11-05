/**
 * help module provides app instruction. 
 */
ivs.widgets.help = function() {
    var dialogWidth = 600,
        minDialogHeight = 300; 
    
    /**
     * Main entry of the module.
     * Note that only the first selected element can be created because variables are shared across selection.
     */
    function module(selection) {
        selection.each(function() {
        	// Dialog
        	var container = $("<div></div>").appendTo(this);
        	container.attr("title", "Help")
        	   .dialog({
            		width: dialogWidth,
            		minHeight: minDialogHeight,
        			show: {effect: 'fade', duration: ivs.TRANSITION_SHOW_HIDE},
                    hide: {effect: 'fade', duration: ivs.TRANSITION_SHOW_HIDE}
        		});
    		
    		// Content box
        	var textDiv = $("<div>" +
                "Hold ALT and drag mouse to move the entire visualisation</br>" +
                "Hold ALT and wheel mouse to zoom the entire visualisation</br></br>" +
                "Hold SHIFT and drag a rectangle to select items in the visualisation</br></br>" +
                "Hold CTRL and drag an item to move it around. Can drop it onto the toolbar to create new visualisation or onto the memory bar to clone the memory" +
                "</div>").appendTo(container);
        });
	} 

   	return module;
};