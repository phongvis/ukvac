/**
 * spinner module provides a spinning object to indicate ongoing process.
 * Source: http://fgnass.github.io/spin.js/
 */
ivs.widgets.spinner = function() {
    var spinner,
    	target;

    /**
     * Main entry of the module.
     * Note that only the first selected element can be created because variables are shared across selection.
     */
    function module(selection) {
        var opts = {
            lines: 12, // The number of lines to draw
            length: 16, // The length of each line
            width: 6, // The line thickness
            radius: 16, // The radius of the inner circle
            corners: 1, // Corner roundness (0..1)
            rotate: 0, // The rotation offset
            direction: 1, // 1: clockwise, -1: counterclockwise
            color: '#000', // #rgb or #rrggbb
            speed: 1, // Rounds per second
            trail: 60, // Afterglow percentage
            shadow: true, // Whether to render a shadow
            hwaccel: true, // Whether to use hardware acceleration
            className: 'spinner', // The CSS class to assign to the spinner
            zIndex: 2e9, // The z-index (defaults to 2000000000)
            top: 0, // Top position relative to parent in px
            left: 0 // Left position relative to parent in px
        };
        
        spinner = new Spinner(opts);
    }

    /**
     * Starts spinning.
     */
    module.spin = function(x, y) {
    	target = $("<div></div>").appendTo("body")
        	.css({ "position": "absolute", "left": x - 45, "top": y - 45 });
        spinner.spin(target[0]);
    };

    /**
     * Stops spinning.
     */
    module.stop = function() {
    	spinner.stop();
    	target.remove();
    };
    
    return module;        
};
