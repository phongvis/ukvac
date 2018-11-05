/**
 * baseVis module provides a base implementation for a visualisation.
 * baeVis provides setters/getters for attributes such as width and height.
 * baseVis handles common interaction such as zooming and panning.
 * Sub-classes override "buildVis" method to actually build the content of the visualisation.
 */
ivs.vises.baseVis = function() {
    var width = originalWidth = 400, // The width assigned to the visualisation
        height = originalHeight = 300, // The height assigned to the visualisation
        id = -1, // Unique ID associated with this visualisation
        columnIndex = -1, // Which column the colapsed visualisation stays?
        memoryRowIndex = -1, // Index of the row in the memory bar if the visualisation collapsed
        className, // CSS class
        zoomPan = true, // true if allow zoom/pan the entire visualisation
        infoPanel = true, // true if the information panel (resize buttons + data source label) is visible
        dataSource, // Prodivdes the source of data used in the visualisation
        attributeMappings = [
            { "name": "x", "value": function(d) { return +d.x; } },            
            { "name": "y", "value": function(d) { return +d.y; } }
        ], // All possible mappings of value attributes 
        activeMappingIndex = 0, // dataSource has multiple item mappings. This index stores the one currently being used.
        zoom, // d3.behavior.zoom
        scale = 1, // Zoom factor of the entire visualisation
        translate = [0, 0], // Translate of the entire visualisation
        collapsed = false, // true if the visualisation is collapsed/minimised
        starred = false, // true if the visualisation is bookmarked
        floating = false, // true if the visualisation was moved and will be ignored in auto-reaggrangement
        container, // The g element containing the visualisation
        infoContainer, // The g element containing the information panel
        data; // The data being used

    var dispatch = d3.dispatch("visActivated", "visCollapsed", "visRemoved", "itemDragged", "itemDropped", "dataMappingChanged");
    
    /**
     * Main entry of the module. This will be invoked by selection.call(baseVis).
     * Note that only the first selected element can be created because variables are shared across selection.
     */
    function module(selection) {
        selection.each(function(theData) {
            // Update data
            data = theData;
            
             // Create container g element
            var parent = d3.select(this);
            if (!container) {
                parent.style("opacity", 0).transition().duration(ivs.TRANSITION_SHOW_HIDE * 2).style("opacity", 1);
                container = parent.append("g").attr("transform", "translate(" + translate + ") scale(" + scale +")");
                infoContainer = parent.append("g").attr("transform", "translate(" + translate + ") scale(" + scale +")");
            }
            if (className) { 
                container.classed(className, true);
            }

            if (zoomPan && !zoom) {
                zoom = d3.behavior.zoom()
                    .size([width, height])
                    .scale(scale)
                    .translate(translate)
                    .on("zoom", function() {
                        if (!d3.event.sourceEvent.altKey) { // Require holding Alt
                            // Revert the changes
                            zoom.scale(scale);
                            zoom.translate(translate);
                            return;
                        }

                        // // Semantic zoom: just update width/height and call redraw
                        // if (scale !== d3.event.scale) {
                        //     // - Translate too keep the visualisation centre at the mouse position
                        //     var t = d3.transform(container.attr("transform")).translate;
                        //     t[0] -= (d3.event.scale - scale) * originalWidth * 0.5;
                        //     t[1] -= (d3.event.scale - scale) * originalHeight * 0.5;
                        //     scale = d3.event.scale;
                        //     container.attr("transform", "translate(" + t[0] + "," + t[1] + ") scale(1)");

                        //     // - Update background
                        //     width = originalWidth * d3.event.scale;
                        //     height = originalHeight * d3.event.scale;
                        //     container.select("rect.ivs-baseVis-background").attr("width", width).attr("height", height);

                        //     // - Update vis
                        //     buildInfoPanel();
                        //     module.buildVis();
                        // }

                        // Manually zoom/pan: set floating true so that it will be ignored in auto-rearrangement
                        floating = true;

                        // Geometric zoom
                        scale = d3.event.scale;
                        translate = d3.event.translate;
                        buildInfoPanel();
                        container.attr("transform", "translate(" + translate + ") scale(" + scale +")");
                        infoContainer.attr("transform", "translate(" + translate + ") scale(" + scale +")");
                        
                        // Bring the dragged object to front
                        parent.moveToFront();

                        container.style("cursor", "move");
                    }).on("zoomend", function() { container.style("cursor", "default"); });
                
                // Note that the parent calls zoom, not the container.
                parent.call(zoom).on("dblclick.zoom", null);

                // d3.behavior.zoom now can handle zoom/pan together without the need of d3.behavior.drag.
                // However it's still useful when panning only or semantic zooming + panning.
                // Pan
                // var drag = d3.behavior.drag()
                //     .on("drag", function() {
                //         if (!d3.event.sourceEvent.altKey) {
                //             return;
                //         }
                       
                //         // Get current transform
                //         var t = d3.transform(container.attr("transform")).translate;
                //         var s = d3.transform(container.attr("transform")).scale;
                        
                //         // Update it with new offset
                //         t[0] += d3.event.dx;
                //         t[1] += d3.event.dy;
                //         container.attr("transform", "translate(" + t[0] + "," + t[1] + ") scale(" + s + ")");
                        
                //         // Bring the dragged object to front
                //         parent.moveToFront();
                //     });
                // container.call(drag)
                //     .on("mousemove", function() { // Move cursor when holding shift
                //         container.style("cursor", d3.event.shiftKey ? "move" : "default");
                //     });
            }

            // Rectangular background to ensure dragging on the entire visualisation.
            // Without this, it is only draggable on the "real" objects, not the entire "g" element.
            var rect = container.selectAll("rect.ivs-baseVis-background").data([0]); // Trick to create rect only once
            rect.enter().append("rect").classed("ivs-baseVis-background", true);
            rect.attr("width", width)
                .attr("height", height);

            // Create resize buttons, data source label
            buildInfoPanel();

            // Call the main method to build the visualisation.
            module.buildVis();
        });
    }

    function buildInfoPanel() {
        if (!infoPanel) {
            return;
        }

        var buttonSize = 10;

        // Data source label
        if (dataSource) {
            var dataSourceFront = infoContainer.selectAll("g.ivs-baseVis-dataSource-front").data([0]);
            var newDataSourceFront = dataSourceFront.enter().append("g").classed("ivs-baseVis-dataSource-front", true);
            dataSourceFront.attr("transform", "translate(0,-4)");
            
            var text = newDataSourceFront.append("text").text(module.getFullSourceInfo() + " > ");

            var dataSourceRear = infoContainer.selectAll("g.ivs-baseVis-dataSource-rear").data([0]);
            var newDataSourceRear = dataSourceRear.enter().append("g").classed("ivs-baseVis-dataSource-rear", true);
            var frontWidth = dataSourceFront.select("text").node().getBBox().width;
            dataSourceRear.attr("transform", "translate(" + (frontWidth + 3) + ",-4)");
            var cycleButton = ivs.widgets.cycleButton()
                .texts(dataSource.itemMappings)
                .currentIndex(activeMappingIndex)
                .maxWidth(width - frontWidth - buttonSize * 10)
                .on("indexChanged", function(index) {
                    activeMappingIndex = index;
                    dispatch.dataMappingChanged(id);
                });
            newDataSourceRear.call(cycleButton);
        }

        // Resize buttons
        var resize = infoContainer.selectAll("g.ivs-baseVis-resize").data([0]);
        var newResize = resize.enter().append("g").classed("ivs-baseVis-resize", true);
        resize.attr("transform", "translate(" + width + "," + -12 / scale + ") scale(" + (1 / scale) + ")");

        // - Close
        var closeButton = newResize.append("g").classed("ivs-baseVis-button", true)
            .on("click", function() {
                module.remove();
                dispatch.visRemoved(id);
            });
        
        var xOffset = -buttonSize - 2;
        closeButton.append("circle")
            .attr("cx", xOffset)
            .attr("r", buttonSize);
        closeButton.append("line")
            .attr("x1", xOffset + 3 - buttonSize)
            .attr("y1", 3 - buttonSize)
            .attr("x2", xOffset + buttonSize - 3)
            .attr("y2", buttonSize - 3)
        closeButton.append("line")
            .attr("x1", xOffset + buttonSize - 3)
            .attr("y1", 3 - buttonSize)
            .attr("x2", xOffset + 3 - buttonSize)
            .attr("y2", buttonSize - 3);

        // - Collapse/Restore
        var xOffset = -buttonSize * 3 - 5;
        var collapseButton = newResize.append("g").classed("ivs-baseVis-button ivs-baseVis-collapse", true)
            .on("click", function() {
                // If it's starred, check if validate to bookmark
                if (!collapsed && starred && !ivs.app.validateBookmark(id)) {
                    ivs.updateErrorMessage("Bookmark invalid", ivs.errorMessage)
                    return;
                }
                
                collapsed = !collapsed;
                floating = false; // Reset to sticky status when collapse/restore
                
                // Add to memory bar by setting the row it should be in if it doesn't belong to any row yet
                if (collapsed && starred && memoryRowIndex === -1) {
                    memoryRowIndex = ivs.app.getMemoryActiveRowIndex();
                }

                toggleVis();

                // Dispatch event collapsed after its collapsing but dispatch event activated before hand
                if (collapsed) {
                    // Shift left existing centre vises
                    ivs.app.rearrangeCentreVises(id);
                    setTimeout(function() {
                        dispatch.visCollapsed(id); 
                    }, ivs.TRANSITION_MOVEMENT);
                } else {
                    dispatch.visActivated(id);
                }
            });

        collapseButton.append("circle")
            .attr("cx", xOffset)
            .attr("r", buttonSize);
        collapseButton = resize.select("g.ivs-baseVis-collapse");
        collapseButton.selectAll("line").remove();
        if (collapsed) {
            collapseButton.append("line")
                .attr("x1", xOffset - buttonSize + 3)
                .attr("y1", 0)
                .attr("x2", xOffset + buttonSize - 3)
                .attr("y2", 0)
                .style("stroke-width", 4);
            collapseButton.append("line")
                .attr("x1", xOffset)
                .attr("y1", -buttonSize + 3)
                .attr("x2", xOffset)
                .attr("y2", buttonSize - 3)
                .style("stroke-width", 4);
        } else {
            collapseButton.append("line")
                .attr("x1", xOffset + 3 - buttonSize)
                .attr("y1", 3)
                .attr("x2", xOffset + buttonSize - 3)
                .attr("y2", 3)
                .style("stroke-width", 4);
        }

        // - Star
        xOffset -= buttonSize * 3 - 5;
        var starButton = newResize.append("g").classed("ivs-baseVis-button", true).classed("starred", true)
            .on("click", function() {
                starred = !starred;
                d3.select(this).style("fill", starred ? "yellow" : "none");
            });
        starButton.append("polygon")
            .attr("points", ivs.helpers.d3.calculateStarPoints(xOffset, 0, 5, 11, 5));
        starButton.style("fill", starred ? "yellow" : "none");

        // - Reset view
        xOffset -= buttonSize * 3 - 5;
        var resetButton = newResize.append("g").classed("ivs-baseVis-button", true)
            .on("click", function() {
                module.resetView();
            });
        resetButton.append("circle")
            .attr("cx", xOffset)
            .attr("r", buttonSize);
        resetButton.append("text")
            .attr("x", xOffset - 5)
            .attr("y", 5)
            .text("R")
            .style("cursor", "default");

        // - Save
        xOffset -= buttonSize * 3 - 5;
        var saveButton = newResize.append("g").classed("ivs-baseVis-button", true)
            .on("click", function() {
                module.saveView();
            });
        saveButton.append("circle")
            .attr("cx", xOffset)
            .attr("r", buttonSize);
        saveButton.append("text")
            .attr("x", xOffset - 5)
            .attr("y", 5)
            .text("C")
            .style("cursor", "default");        
    }

    function toggleVis(hidden) {
        scale = collapsed ? ivs.THUMBNAIL_RATIO : 1;
        translate = collapsed ? ivs.app.getCollapsedPosition(module) : ivs.app.getCentrePosition();
        ivs.app.updateNumCollapsedVises(collapsed ? 1 : -1);
        module.transform(translate, scale, hidden ? 0 : 1);
    }

    function transform(t, s, opacity) {
        translate = t;
        scale = s;
        zoom.scale(scale);
        zoom.translate(translate);

        container.transition().duration(ivs.TRANSITION_MOVEMENT).attr("transform", "translate(" + translate + ") scale(" + scale +")").style("opacity", opacity);
        infoContainer.transition().duration(ivs.TRANSITION_MOVEMENT).attr("transform", "translate(" + translate + ") scale(" + scale +")").style("opacity", opacity).each("end", buildInfoPanel);
    }

    /**
     * Builds the visualisation. Subclasses should override this.
     */
    module.buildVis = function() {
        return this;
    };

    /**
     * Resets to default view. Subclasses should override this.
     */
    module.resetView = function() {
        return this;
    };

    /**
     * Save this visualization. Subclasses should override this.
     */
    module.saveView = function() {
        var dialog = $("<div class='sm-capture-dialong' title='Capture Information'></div>").appendTo("body");
        $("<textarea type='text' placeholder='Type a short note about your capture' class='text ui-widget-content ui-corner-all' id='inpNote'></textarea>").appendTo(dialog);
        $("<label for='inpTag' style='padding-top: 10px; padding-bottom: 3px'>Tags (separate by space)</label><input type='text' class='text ui-widget-content ui-corner-all' id='inpTag'></input>").appendTo(dialog);

        dialog.dialog({
            buttons: {
                "Save": function() {
                    // The 'finding' object
                    var finding = {
                        origin: "ukvac2",
                        note: dialog.find("#inpNote").val(),
                        tags: dialog.find("#inpTag").val()
                    };

                    // Save to database
                    $.ajax({
                        url: "http://localhost:1984/findings/ukvac2",
                        type: "POST",
                        data: finding,
                        crossDomain: true
                    }).done(function(d) {
                        // TODO: save current setting of the visualisation together with d.id, so that it can be restored later
                    });

                    $(this).dialog("close");
                }, 
                "Cancel": function() {
                    $(this).dialog("close");
                }
            }
        });

        return this;
    };

    /**
     * Registers drag event for items
     */
    module.registerDragEvent = function(selection, merge, callback) {
        selection.call(ivs.widgets.ghost().merge(merge)
            .on("itemDragged", function(e) {
                e.dataSource = dataSource;
                e.dataSource.activeMapping = dataSource.itemMappings[activeMappingIndex];
                dispatch.itemDragged(e);
            }).on("itemDropped", function(e) {
                e.dataSource = dataSource;
                e.dataSource.activeMapping = dataSource.itemMappings[activeMappingIndex];
                if (e.dropTarget && callback) {
                    callback.call(this, e.dragObject, e.dropTarget);
                }
                dispatch.itemDropped(e);
            }));
    };

    /**
     * Updates selected and brushed status from the manager.
     */
    module.updateSelectionBrushing = function(selection, valueFunction, callback) {
        var contentType = dataSource.itemMappings[activeMappingIndex];
        selection.each(function(d) {
            var selected = ivs.app.selectionManager.selected(contentType, valueFunction.call(this, d));
            d3.select(this).classed("selected", selected);

            // Change opacity
            if (ivs.app.selectionManager.anySelected()) {
                if (selected) {
                    d3.select(this).style("opacity", 1);
                } else {
                    var brushed = ivs.app.selectionManager.brushed(contentType, valueFunction.call(this, d));
                    d3.select(this).style("opacity", brushed ? 1 : 0.4);
                }
            } else {
                d3.select(this).style("opacity", 1);
            }
        });

        if (callback) {
            callback.call(this);
        }
    };

    /**
     * Registers click event for items.
     */
    module.registerClickEvent = function(selection, valueFunction) {
        selection.on("click", function(d) {
            if (d3.event.altKey) { return; } // Pan

            if (d3.event.ctrlKey) {
                d3.select(this).classed("selected", d.selected = !d.selected);
            } else {
                selection.classed("selected", function(p) { 
                    p.selected = d === p;
                    return p.selected; 
                });
            }

            module.setSelected(selection, valueFunction);
        });
    };

    /**
     * Sets selected items to the selection manager.
     */
    module.setSelected = function(selection, valueFunction) {
        var list = [];
        selection.each(function(d) {
            if (d3.select(this).classed("selected")) {
                list.push(valueFunction.call(this, d));
            }
        });
        ivs.app.selectionManager.setSelected(dataSource.itemMappings[activeMappingIndex], list);
    };

    /**
     * Registers brushed event for items.
     */
    module.registerBrushedEvent = function(selection, valueFunction, callback) {
        var namespacedEvent = "selectionChanged." + id;
        ivs.app.selectionManager.on(namespacedEvent, function() {
            module.updateSelectionBrushing(selection, valueFunction, callback);
        });
    };

    /**
     * Registers deselection by clicking onto void space.
     */
    module.registerDeselection = function(container, selection) {
        container.on("click", function() {
            if (d3.event.defaultPrevented) { return; } // Prevent triggering by dragging

            var overDot = false;
            selection.each(function() {
                if (d3.select(this).node().containsPoint({ x: d3.event.pageX, y: d3.event.pageY })) {
                    overDot = true;
                }
            });

            if (!overDot) {
                ivs.app.selectionManager.setSelected(dataSource.itemMappings[activeMappingIndex], []);
            }
        });
    }

    /**
     * Sets/Gets the id of the visualisation. 
     */
    module.id = function(value) {
        if (!arguments.length) return id;
        id = value;
        return this;
    };

    /**
     * Sets/Gets the memoryRowIndex of the visualisation. 
     */
    module.memoryRowIndex = function(value) {
        if (!arguments.length) return memoryRowIndex;
        memoryRowIndex = value;
        return this;
    };

    /**
     * Sets/Gets the width of the visualisation. 
     */
    module.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        originalWidth = width;
        return this;
    };
    
    /**
     * Sets/Gets the height of the visualisation. 
     */
    module.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        originalHeight = height;
        return this;
    };

    /**
     * Sets/Gets the class name of the visualisation. 
     */
    module.className = function(value) {
        if (!arguments.length) return className;
        className = value;
        return this;
    };
    
    /**
     * Sets/Gets the zoom/pan option for the visualisation. 
     */
    module.zoomPan = function(value) {
        if (!arguments.length) return zoomPan;
        zoomPan = value;
        return this;
    };

    /**
     * Sets/Gets the information panel (resize button + data source label) option for the visualisation. 
     */
    module.infoPanel = function(value) {
        if (!arguments.length) return infoPanel;
        infoPanel = value;
        return this;
    };

    /**
     * Sets/Gets the data source of the visualisation. 
     */
    module.dataSource = function(value) {
        if (!arguments.length) return dataSource;
        dataSource = value;
        return this;
    };

    /**
     * Sets/Gets the index of item mappings used in the visualisation. 
     */
    module.activeMappingIndex = function(value) {
        if (!arguments.length) return activeMappingIndex;
        activeMappingIndex = value;
        return this;
    };

    /**
     * Gets the active mapping of the visualisation.
     */
    module.activeMapping = function(value) {
        return dataSource.itemMappings[activeMappingIndex];
    };

    /**
     * Sets/Gets the translate of the visualisation. 
     */
    module.translate = function(value) {
        if (!arguments.length) return translate;
        translate = value;
        return this;
    };

    /**
     * Sets/Gets the scale of the visualisation. 
     */
    module.scale = function(value) {
        if (!arguments.length) return scale;
        scale = value;
        return this;
    };

    /**
     * Translates the visualisation by the given offset and changes opacity.
     */
    module.transformByOffset = function(offset, opacity) {
        if (container) {
            var t = d3.transform(container.attr("transform")).translate;
            t[0] += offset[0];
            t[1] += offset[1];
            transform(t, scale, opacity);
        }
    };

     /**
     * Translates the visualisation by the given translate, scale and changes opacity.
     */
    module.transform = function(t, s, opacity) {
        if (container) {
            // Offset by the parent
            var parentTranslate = d3.transform(d3.select(container.node().parentNode).attr("transform")).translate;
            t[0] -= parentTranslate[0];
            t[1] -= parentTranslate[1] - (collapsed && !starred ? ivs.INFO_PANEL_HEIGHT : 0); // Include info buttons

            transform(t, s, opacity);
        }
    };

    /**
     * Gets the container of the visualisation. 
     */
    module.container = function() {
        return container;
    };

    /**
     * Gets the backing data of the visualisation. 
     */
    module.data = function() {
        return data;
    };

    /**
     * Sets/Gets the collapsed status of the visualisation. 
     */
    module.collapsed = function(value) {
        if (!arguments.length) return collapsed;
        collapsed = value;
        return this;
    };

    /**
     * Collapses the visualisation programmatically.
     */
    module.collapse = function(hidden) {
        collapsed = true;
        if (starred && memoryRowIndex === -1) {
            memoryRowIndex = ivs.app.getMemoryActiveRowIndex();
        }
        toggleVis(hidden);
    };

    /**
     * Shows/hides the visualisation.
     */
    module.show = function(visibility) {
        container.transition().duration(ivs.TRANSITION_SHOW_HIDE).style("opacity", visibility);
        infoContainer.transition().duration(ivs.TRANSITION_SHOW_HIDE).style("opacity", visibility);
    };

    /**
     * Sets/Gets the floating status of the visualisation. 
     */
    module.floating = function(value) {
        if (!arguments.length) return floating;
        floating = value;
        return this;
    };

    /**
     * Removes the visualisation.
     */
    module.remove = function() {
        if (container) {
            container.transition().duration(ivs.TRANSITION_SHOW_HIDE).style("opacity", 0).remove();
            infoContainer.transition().duration(ivs.TRANSITION_SHOW_HIDE).style("opacity", 0).remove();
        }
    };

    /**
     * Sets/Gets the starred status of the visualisation. 
     */
    module.starred = function(value) {
        if (!arguments.length) return starred;
        starred = value;

        // Change appearance
        if (infoContainer) {
            infoContainer.select(".starred").style("fill", starred ? "yellow" : "none");
        }
            
        return this;
    };

    /**
     * Sets/Gets attribute mappings of the visualisation. 
     */
    module.attributeMappings = function(value) {
        if (!arguments.length) return attributeMappings;
        attributeMappings = value;
        return this;
    };

    /**
     * Returns leaf text of data source.
     */
    module.getDataSourceLeafText = function() {
        if (dataSource) {
            var child = dataSource.child;
            while (child.child) {
                child = child.child;
            }
            return child.text;
        }

        return "";
    };

    /**
     * Returns full provenance information of data source.
     */
    module.getFullSourceInfo = function() {
        var label = "";
        if (dataSource) {
            label = dataSource.text + (dataSource.child ? " > " : "");
            var child = dataSource.child;
            while (child) {
                label += child.text + (child.child ? " > " : "");
                child = child.child;
            }
        }

        return label;
    };

    // Caller can listen to the dispatched events by using "on".
    d3.rebind(module, dispatch, "on");

    return module;
};