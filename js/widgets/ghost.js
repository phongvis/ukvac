/**
 * ghost module provides drag behaviour and a ghost for dragging.
 * By default, ghost uses text from 'name' attribute.
 */
ivs.widgets.ghost = function() {
    var merge = false,
        callback;
    var dispatch = d3.dispatch("itemDragStarted", "itemDragged", "itemDropped");
    
    function module(selection) {
        selection.each(function() {
            d3.select(this).call(d3.behavior.drag()
                .on("dragstart", function(d) { 
                    if (!d3.event.sourceEvent.ctrlKey) { return; }

                    ivs.updateDragGhost(1, d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY, getDragNames(selection, d));
                }).on("drag", function(d) {
                    if (!d3.event.sourceEvent.ctrlKey) { return; }

                    d.isBeingDragged = true;
                    ivs.updateDragGhost(1, d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY, getDragNames(selection, d));

                    // Merge
                    if (merge) {
                        // Check if over any item
                        var over = false;
                        selection.each(function(d2) {
                            if (d != d2 && this.containsPoint({ x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY })) {
                                over = true;
                            }
                        });
                        ivs.updateMergeIcon(over ? 1 : 0, d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY);                        
                    }

                    dispatch.itemDragged({ pos: { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY } });
                }).on("dragend", function(d) {
                    ivs.updateDragGhost(0);
                    ivs.updateMergeIcon(0);
                    
                    if (d.isBeingDragged) {
                        // Check if over any item
                        var dropTarget;
                        if (merge) {
                            selection.each(function(d2) {
                                if (d != d2 && this.containsPoint({ x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY })) {
                                    dropTarget = d2;
                                }
                            });
                        }
                        dispatch.itemDropped({ pos: { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY }, name: getDragNames(selection, d), dragObject: d, dropTarget: dropTarget });
                    }
                    
                    d.isBeingDragged = false;
                }));
        });
    }

    function getDragNames(selection, d) {
        // If shift is hold, drag all selected items; otherwise, drag the moving one
        var dragNames = [d.name];
        if (d3.event.sourceEvent.which === 3) {
            dragNames = [];
            selection.each(function(d2) {
                if (d3.select(this).classed("selected")) {
                    dragNames.push(d2.name);
                }
            });
        }

        return dragNames;
    }

    /**
     * Allows merge icon update or not.
     */
    module.merge = function(value) {
        if (!arguments.length) return merge;
        merge = value;
        return this;
    };

    // Binds custom events
    d3.rebind(module, dispatch, "on");
    
    return module;        
};
