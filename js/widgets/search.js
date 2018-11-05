/**
 * SEARCH module provides search box input and handles search queries.
 * The custom event <code>searchCompleted</code> is fired when the query is finished.
 * Extra properties are added to the event object including <code>searchResult</code>, <code>searchPosition</code>, <code>searchWord</code>.
 */
ivs.widgets.search = function() {
    var databaseUrl = "http://10.18.115.56:8080/chinvisque/query.jsp?json=Yes&type=keyword";
    // var databaseName = "VAST%2003";
    var databaseName = "ACM%20CHI";
        
        var dispatch = d3.dispatch("searchCompleted");
    
    function module(selection) {
        // Spinning effect when loading
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
        
        var spinner = new Spinner(opts);
                
        // Search interface
        selection.on("dblclick", function() {
            var dom = selection.node();
            if (d3.event.target != dom) {
                // To prevent processing when double-clicking on other elements, besides the empty space
                return false;
            }
            
            searchPosition = { x: d3.event.pageX, y: d3.event.pageY };
            if (!invisque.spinTarget) {
                invisque.spinTarget = $("<div id='waitSpinner' style='position:absolute'></div>").appendTo("body");
            }
            
            // Show a text-box
            var allowToRemove = true;
            
            var searchBox = $("<input style='position:absolute; width: 160px'></input>").hide().appendTo("body").show(invisque.TRANSITION_SHOW_HIDE);
            searchBox.css({ "left": searchPosition.x - 80, "top": searchPosition.y - 25 })
                .focus()
                .keypress(function(e) {
                    if (e.which === 13) {
                        invisque.spinTarget.css({ "left": searchPosition.x + 90, "top": searchPosition.y - 50 });
                        spinner.spin(invisque.spinTarget[0]);
                        
                        allowToRemove = false;
                        e.searchWord = this.value;
                        e.searchPosition = searchPosition;
                            
                        // Un-comment to use dummy test data
                        // var numResults = Math.max(Math.floor(Math.random() * 20), 15);
                        // e.searchResult = d3.shuffle(testData.data).slice(0, numResults);
                        // e.idMap = testData.id_map;
                        // dispatch.searchCompleted(e);
                        // spinner.stop();
                        // searchBox.remove();
                        
                        var url = databaseUrl + "&trigger=" + databaseName + "&search=" + this.value;
    
                        d3.json(url, function(error, json) {
                            spinner.stop();
                            
                            if (error) {
                                console.info(url);
                                console.error(error);
                                
                                // Show error message
                                $("<div></div>").appendTo("body")
                                    .attr("title", "INVISQUE")
                                    .text("Sorry! There seems to be a problem when connecting to the database. Please try it again!")
                                    .dialog({
                                        height: 100,
                                        modal: true,
                                        show: {effect: 'fade', duration: invisque.TRANSITION_SHOW_HIDE},
                                        hide: {effect: 'fade', duration: invisque.TRANSITION_SHOW_HIDE}
                                    });
                            } else {
                                e.searchResult = json.data;
                                e.idMap = json.id_map;
                                dispatch.searchCompleted(e);
                            }
                            
                            searchBox.remove();
                        });
                }
            }).on("blur", function() {
                if (allowToRemove) { // To prevent removing when pressed enter and wait for loading data
                    searchBox.remove();
                }
            });
                
        });
    }
    
    // Binds custom events
    d3.rebind(module, dispatch, "on");
    
    return module;        
};
