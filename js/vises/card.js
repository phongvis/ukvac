/**
 * card module provides index-card representation of input data and its interactive features.
 * It represents a cluster of search results / documents.
 */
ivs.vises.card = function() {
    // Base
    var module = ivs.vises.baseVis();
    var width, height, container, data, attributeMappings;

    var cardWidth = 180,
        cardHeight = 250, // Hardcoded based on cardWidth, used when finding boundary of the card group, 280 for classic, 250 for metro
        cardPadding = 5,
        maxNumCardsDisplay = 5,
        groupAndCardsPadding = 35,
        titleHeight = 100; // Aproxiamtelly for clipping
     
    var parent, // The selection input
        controlGroup, // The g element containig control elements like title, buttons, results info
        cardGroup, // The g element containing all cards
        titleGroup, // The g element containing the group title
        resultsInfoGroup, // The g element containing results information
        xScale, // Scale for the x-coordinate of cards
        startIndex, endIndex, // Active group contains documents from startIndex (inclusive) to endIndex (exclusive) of data
        numCardsDisplay, // Number of index-cards displaying at the moment
        halfGroupWidth, groupWidth,
        idMap,
        topMiddlePosition,
        searchWord,
        cat1Target, cat2Target; // The highlight target of categorical values
        
    // Key function based on "id" property, used when binding data
    var key = function(d) {
        return d.id;
    };

    /**
    * Overrides the visualisation creation method.
    */
    module.buildVis = function() {
        // Retrieve properties from the base.
        container = this.container();
        parent = d3.select(container.node().parentNode);
        data = this.data();
        width = this.width();
        height = this.height();

        buildVis();
    }
    
    /**
     * Concrete classes modifies this function to create visualisation.
     */
    function buildVis() {
        // Dynamically find the number of maximum cards based on the visualisation width
        maxNumCardsDisplay = Math.floor(width / cardWidth);
        // Initialise 
        updateIndices(0, Math.min(maxNumCardsDisplay, data.length));
        groupWidth = maxNumCardsDisplay * (cardWidth + cardPadding) - cardPadding;
        halfGroupWidth = groupWidth / 2;
        xScale = d3.scale.linear()
            .domain([0, maxNumCardsDisplay])
            .range([0, groupWidth + cardPadding]); 
        
        // Intialise and display the container at desired position
        //  - Convert to world coordinates
        topMiddlePosition.x = (topMiddlePosition.x - module.translate()[0]) / module.scale();
        topMiddlePosition.y = (topMiddlePosition.y - module.translate()[1]) / module.scale();
        
        // - Translate of the container
        var offsetX = topMiddlePosition.x - halfGroupWidth;
        var offsetY = topMiddlePosition.y + groupAndCardsPadding;
        
        // container.data([{ x: offsetX, y: offsetY }])
        //     .attr("transform", "translate(" + offsetX + "," + offsetY + ")")
        //     .style("opacity", 0)
        //     .transition().duration(ivs.TRANSITION_SHOW_HIDE)
        //     .style("opacity", 1);

        // A clip path, used when changing page            
        parent.append("clipPath").attr("id", "chart-area")
            .append("rect") 
                .attr("y", -titleHeight)
                .attr("width", groupWidth)
                .attr("height", "100%");
            
        buildGroup();
        buildCards();
    }

    /**
     * Build the group controller.
     */
    function buildGroup() {
        // Group container
        controlGroup = container.append("g").attr("transform", "translate(0, 30)");
        
        // // Title
        // ivs.timeoutId = 0;
        
        // titleGroup = controlGroup.append("text")
        //     .classed("ivs-card-svg-group-title", true)
        //     .attr("x", halfGroupWidth)
        //     .attr("y", -groupAndCardsPadding)
        //     .attr("text-anchor", "middle")
        //     .text(searchWord)
        //     .on("dblclick", function() { // Double-click to toggle visibility
        //         // var newOpacity = 1 - parseInt(cardGroup.style("opacity"));
        //         // var newVisibility = newOpacity === 1 ? "block" : "none";
        //         // this.setAttribute("collapsed", 1 - newOpacity); 
                
        //         // // Style display:none doesn't have transition? Have to separate them and use delay.
        //         // function updateOpacity(control) {
        //         //     control.transition().duration(ivs.TRANSITION_SHOW_HIDE)
        //         //         .style("opacity", newOpacity)
        //         //         .each("end", function() {
        //         //             d3.select(this).style("display", newVisibility);
        //         //         });                        
        //         // }

        //         // updateOpacity(navigationGroup);
        //         // updateOpacity(cardGroup);

        //         // // Collapsed group has shorter results info
        //         // updateResultsInfo();
        //     }).on("mousedown", function() { // Click and hold for a while to rename
        //         // var pos = { x: d3.event.pageX, y: d3.event.pageY };
        //         // ivs.timeoutId = setTimeout(function() {
        //         //     // Show a textbox for entering new name. Enter, or lose focus will close the text box with update name.
        //         //     var textbox = $("<input style='position:absolute; width: 160px'></input>").hide().appendTo("body").show(ivs.TRANSITION_SHOW_HIDE);
        //         //     var changeName = function(self) {
        //         //         titleGroup.text(self.value);
        //         //         $(self).remove();
        //         //         titleGroup.transition().duration(ivs.TRANSITION_SHOW_HIDE).style("opacity", 1);
        //         //     };

        //         //     textbox.val(searchWord)
        //         //         .css({ "left": pos.x - 80, "top": pos.y - 25})
        //         //         .focus()
        //         //         .keypress(function(e) {
        //         //             if (e.which === 13) {
        //         //                 changeName(this);
        //         //             }
        //         //         }).on("blur", function() {
        //         //             changeName(this);
        //         //         });
                        
        //         //     titleGroup.transition().duration(ivs.TRANSITION_SHOW_HIDE).style("opacity", 0);
        //         // }, ivs.HOLD_TO_RENAME_DURATION);
        //     })
        //     .on("mouseover", function() {
        //         // d3.select(this).style("cursor", "move");
        //     });
            
        // d3.select(document)
        //     .on("mouseup", function() {
        //        clearTimeout(ivs.timeoutId); 
        //     });
            
        // Handle group drag. Try to process when dragging title only but failed, need to attach to the whole container.
        // container.call(d3.behavior.drag()
        //     .on("drag", function() {
        //         var d = container.data()[0];
        //         d.x += d3.event.dx;
        //         d.y += d3.event.dy;
        //         container.attr("transform", "translate(" + d.x + "," + d.y + ")");
        //         container.moveToFront();    
                
        //         clearTimeout(ivs.timeoutId);
        //     }));
       
        // Results info
        resultsInfoGroup = controlGroup.append("text")
            .classed("ivs-card-svg-group-results-info", true)
            .attr("x", halfGroupWidth)
            .attr("y", -10)
            .attr("text-anchor", "middle");

        updateResultsInfo();

        // Group of controller buttons
        var navigationGroup = controlGroup.append("g");
        
        // - Previous page
        x = halfGroupWidth - cardWidth / 2 - 30;
        navigationGroup.append("polygon")
            .classed("ivs-card-svg-group-button", true)
            .attr("points", x + ", -5 " + x + ", -25 " + (x - 20) + ", -15")
            .on("click", gotoPreviousPage);
            
        // - Next page
        var x = halfGroupWidth + cardWidth / 2 + 30;
        navigationGroup.append("polygon")
            .classed("ivs-card-svg-group-button", true)
            .attr("points", x + ", -5 " + x + ", -25 " + (x + 20) + ", -15")
            .on("click", gotoNextPage);
            
        // // - Delete group
        // var deleteGroup = navigationGroup.append("g");
        // var cx = x + 40;
        // var cy = -15;
        // var r = 10;
        
        // deleteGroup.append("circle")
        //     .classed("ivs-card-svg-group-button", true)
        //     .attr("cx", cx)
        //     .attr("cy", cy)
        //     .attr("r", r);
        
        // var rOffset = r * Math.sqrt(2) / 2;
        // deleteGroup.append("line")
        //     .classed("ivs-card-svg-group-line", true)
        //     .attr("x1", cx - rOffset)
        //     .attr("y1", cy - rOffset)
        //     .attr("x2", cx + rOffset)
        //     .attr("y2", cy + rOffset);
        // deleteGroup.append("line")
        //     .classed("ivs-card-svg-group-line", true)
        //     .attr("x1", cx + rOffset)
        //     .attr("y1", cy - rOffset)
        //     .attr("x2", cx - rOffset)
        //     .attr("y2", cy + rOffset);
            
        // deleteGroup.on("click", function() {
        //     container.transition().duration(ivs.TRANSITION_SHOW_HIDE)
        //         .style("opacity", 0)
        //         .remove();
        // });
    }
    
    /**
     * Build index-cards within the group.
     */
    function buildCards() {
        // Cards container
        cardGroup = container.append("g").classed("ivs-card-svg-group", true).attr("transform", "translate(0, 30)");
        
        // DATA JOIN: on a active sub-set with key function to allow enter/exit effect
        var cards = cardGroup.selectAll("g").data(data.slice(startIndex, endIndex), key);
        createEnterCards(cards);
        
        // Handle drop event
        // If a card is dropped on me, add it to me
        cardGroup.on("mouseup", function() {
            // Add to the new group
            var d = ivs.draggingCard;
            if (!d) { // Check to only handle when dropping
                return;
            }

            addCardToGroup(d);
            ivs.draggingCard = undefined;
            
            receiveEvents(true);
        });
    }
    
    /**
     * Update the startIndex, endIndex and numCardsDisplay.
     */    
    function updateIndices(start, end) {
        startIndex = start;
        endIndex = end;
        numCardsDisplay = endIndex - startIndex;
    }
    
    /**
     * Enable clipping of the group or not.
     */
    function clip(enabled) {
        if (enabled) { // Enable immediately
            container.attr("clip-path", "url(#chart-area)");
        } else { // Wait to disable when existing transitions finish
            setTimeout(function() { container.attr("clip-path", null); }, ivs.TRANSITION_SHOW_HIDE + ivs.TRANSITION_MOVEMENT);
        }
    }
    
    /**
     * Enable receiving events or not.
     */
    function receiveEvents(enabled, what) {
        if (enabled)  {
            if (ivs.disableEventItem) { 
                ivs.disableEventItem.style("pointer-events", null);
            }
        } else {
            ivs.disableEventItem = what;
            ivs.disableEventItem.style("pointer-events", "none");
        }
    }
    
    /**
     * Returns x-coordinate of the given index-card and option to place the cards in the centre of the group.
     */
    function xPos(i, isCentre) {
        return xScale(i + (isCentre ? (maxNumCardsDisplay - numCardsDisplay) / 2 : 0));
    }
    
    /**
     * Update text in the results info group.
     */
    function updateResultsInfo() {
        var resultsInfo = module.collapsed() ? "(" + data.length + " results)" : 
            endIndex === 0 ? "No results found" : ("Showing results " + (startIndex + 1) + " to " + endIndex + " of " + data.length);
        resultsInfoGroup.text(resultsInfo);
        
        // Self-destroyed
        if (endIndex === 0) {
            container.style("opacity", 1).transition().duration(ivs.TRANSITION_SHOW_HIDE * 2).style("opacity", 0).remove();
        }
    }
    
    /**
     * Slide current index-cards to the left to go to the next page.
     */
    function gotoNextPage() {
        clip(true);
        
        if (endIndex < data.length) {
            updateIndices(endIndex, Math.min(endIndex + maxNumCardsDisplay, data.length));
            
            // DATA JOIN: on a active sub-set with key function to allow enter/exit effect
            var cards = cardGroup.selectAll("g").data(data.slice(startIndex, endIndex), key);
            createEnterCards(cards, "next");
            
            // EXIT
            cleanExitCards(cards, "next");
            
            updateResultsInfo();
        }
        
        clip(false);
    }
    
    /**
     * Slide current index-cards to the right to go to the next page.
     */
    function gotoPreviousPage() {
        clip(true);
        
        if (startIndex >= maxNumCardsDisplay) {
            updateIndices(startIndex - maxNumCardsDisplay, startIndex);
            
            // DATA JOIN: on a active sub-set with key function to allow enter/exit effect
            var cards = cardGroup.selectAll("g").data(data.slice(startIndex, endIndex), key);
            createEnterCards(cards, "prev");
            
            // EXIT
            cleanExitCards(cards, "prev");
                
            updateResultsInfo();
        }
        
        clip(false);
    }

    /**
     * Creates a new set of cards.
     */
    function createEnterCards(cards, transition) {
        // Drag invidual cards
        var enterGroup = cards.enter().append("g");
        var bound, isOutside = false;
        
        // enterGroup
        //     .attr("x", 0)
        //     .attr("y", 0)
        //     .call(d3.behavior.drag()
        //         .on("dragstart", function() {
        //             // The boundary when first dragged to contain the dragging card
        //             bound = cardGroup.node().getBoundingClientRect();

        //             container.moveToFront();
        //         })
        //         .on("drag", function() {
        //             // Dragging
        //             var x = parseInt(d3.select(this).attr("x")) + d3.event.dx;
        //             var y = parseInt(d3.select(this).attr("y")) + d3.event.dy;
        //             d3.select(this)
        //                 .attr("x", x)
        //                 .attr("y", y)
        //                 .attr("transform", "translate(" + x + "," + y + ")")
        //                 .moveToFront();
                        
        //             isOutside = !contains(bound);
                    
        //             // Feedback when adding/removing cards are about to happen. 
        //             if (isOutside) {
        //                 var r = 20;
                        
        //                 if (!ivs.feedbackIcon) {
        //                     ivs.feedbackIcon = d3.select("svg").append("g");
        //                     ivs.feedbackIcon.circle = ivs.feedbackIcon.append("circle")
        //                         .classed("ivs-card-svg-feedback-button", true)
        //                         .attr("r", r);
        //                     ivs.feedbackIcon.line1 = ivs.feedbackIcon.append("line")
        //                         .classed("ivs-card-svg-feedback-line", true);
        //                     ivs.feedbackIcon.line2 = ivs.feedbackIcon.append("line")
        //                         .classed("ivs-card-svg-feedback-line", true);
        //                 }
                        
        //                 var cx = d3.event.sourceEvent.pageX + r;
        //                 var cy = d3.event.sourceEvent.pageY + r;
        //                 ivs.feedbackIcon.circle.attr("cx", cx).attr("cy", cy);
    
        //                 var rOffset = r - 4;
        //                 ivs.feedbackIcon.line1
        //                     .attr("x1", cx - rOffset)
        //                     .attr("y1", cy)
        //                     .attr("x2", cx + rOffset)
        //                     .attr("y2", cy);
        //                 ivs.feedbackIcon.line2
        //                     .attr("x1", cx)
        //                     .attr("y1", cy - rOffset)
        //                     .attr("x2", cx)
        //                     .attr("y2", cy + rOffset);
        //             } else {
        //                 if (ivs.feedbackIcon) {
        //                     ivs.feedbackIcon.remove();
        //                     ivs.feedbackIcon = undefined;
        //                 }
        //             }
                    
        //             // Trick: this card will not receive events to allow the group behind receives mouseup when dragend
        //             receiveEvents(false, d3.select(this));
        //         })
        //         .on("dragend", function(d) {
        //             // If drag outside the boundary, remove it from the group. Otherwise, move it back.
        //             isOutside = !contains(bound);
                    
        //             if (isOutside) {
        //                 // Remove from the old group
        //                 removeCardFromGroup(d);
                        
        //                 // Store the data somewhere so that it can be accessed to add the card to a new group
        //                 ivs.draggingCard = d;
                        
        //                 // If drop on an existing group, add it to that group. Otherwise, create a new group.
        //                 var found = false;
                        
        //                 parent.selectAll(".ivs-card-svg-group")
        //                     .each(function() {
        //                         if (this == cardGroup.node()) { // Ignore itself
        //                             return true;
        //                         }
                                
        //                         if (contains(this.getBoundingClientRect())) {
        //                             found = true;
        //                             return false; // Take the first one
        //                         }
        //                     });
                        
        //                 // Create new group
        //                 if (!found) {
        //                     var card = ivs.card()
        //                         .idMap(idMap)
        //                         .topMiddlePosition({ x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY })
        //                         .searchWord("New cluster");
                                
        //                     parent.datum([d]).call(card);
                                
        //                     ivs.draggingCard = undefined;
        //                 }
        //             } else {
        //                 // Move back to the group
        //                 d3.select(this).transition().duration(ivs.TRANSITION_MOVEMENT)
        //                     .attr("x", 0)
        //                     .attr("y", 0)
        //                     .attr("transform", null);
                        
        //                 receiveEvents(true);
        //             }
                    
        //             if (ivs.feedbackIcon) {
        //                 ivs.feedbackIcon.remove();
        //                 ivs.feedbackIcon = undefined;
        //             }
        //         }));
        
        var offset = 0;
        if (transition === "next" || transition === "remove") {
            offset = groupWidth;
        } else if (transition === "prev") {
            offset = -groupWidth;
        } else if (transition === "add") {
            offset = xScale(numCardsDisplay + (maxNumCardsDisplay - numCardsDisplay - 1) / 2);
        }
        
        // foreignobject > div
        var foreignObject = enterGroup.append("foreignObject")
            .classed("ivs-card-svg-item-fo", true)
            .attr("x", function(d, i) {
                if (transition === "remove" || transition === "add") {
                    return offset; 
                }
                
                return xPos(i, transition !== "next") + offset;
            })
            .attr("y", 0)
            .attr("width", cardWidth)
            .attr("height", "100%")
            .style("opacity", transition === "add" ? 0 : 1);
        
        if (transition) {
            if (transition === "add") {
                foreignObject
                    .transition().duration(ivs.TRANSITION_SHOW_HIDE)
                    .style("opacity", 1);
            } else {
                foreignObject
                    .transition().duration(ivs.TRANSITION_MOVEMENT)
                    .attr("x", function(d, i) {
                        return xPos(i, false);
                    })
                    .each("end", function() {
                        var offset = xScale((maxNumCardsDisplay - numCardsDisplay) / 2);
                        d3.select(this).transition().duration(ivs.TRANSITION_MOVEMENT).attr("x", parseInt(d3.select(this).attr("x")) + offset);
                    });
            }
        }
            
        var cardContainer = foreignObject.append("xhtml:div")
            .classed("ivs-card-item", true);
        
        // - Header
        var divHeader = cardContainer.append("xhtml:div")
            .classed("ivs-card-item-header", true)
            .text(function(d) {
                return +d.top_left; // Assume that top_left is a number
            });
        divHeader.append("xhtml:span")
            .text("×")
            .on("click", function(d) { // TODO: need to focus on the container first; i.e., 2 clicks to remove in the first time
                removeCardFromGroup(d);
            });
        divHeader.append("xhtml:a")
            .attr("href", function(d) { return d.drill_2; })
            .attr("target", "_blank")
            .text("link");
                
        // - Title
        cardContainer.append("xhtml:div")
            .classed("ivs-card-item-title", true)
            .classed("read", function(d) { return ivs.viewedArticlesDict[d.id] ? true : false; })
            .append("xhtml:a")
                .text(function(d) {
                    return d.title.htmlDecode();
                }).on("click", function(d) { // Open content
                    // Mark it as read
                    d3.select(this).classed("read", true);
                    ivs.viewedArticlesDict[d.id] = true;

                    var self = this;
                    var contentViewer = ivs.widgets.contentViewer()
                        .on("documentClosed", function(e) {
                            // Store the taken notes
                            if (e.notes !== "") {
                                ivs.notesDict[d.id] = { note: e.notes, data: d };
                            } else {
                                delete ivs.notesDict[d.id];
                            }
                            
                            // Update notes in cards
                            var noteSelection = d3.select(self.parentNode.parentNode).select(".ivs-card-item-notes");
                            noteSelection.text(e.notes).style("display", e.notes && e.notes !== "" ? "block" : "none");
                            
                            // Update notes in timeline
                            // ivs.updateTimeline();
                        });
                    var viewerData = { title: d.title, abstract: d.blurb, references: d.drill_1, searchWord: searchWord, notes: ivs.notesDict[d.id] ? ivs.notesDict[d.id].note : "" };
                    d3.select(parent.node().parentNode).datum(viewerData).call(contentViewer);
                });
        
        // - Subtitle
        cardContainer.append("xhtml:div")
            .classed("ivs-card-item-subtitle", true)
            .text(function(d) {
                return d.subtitle;
            });
            
        // - Category 1
        var cate1 = cardContainer.append("xhtml:div")
            .classed("ivs-card-item-category", true);
        cate1.append("xhtml:div")
            .classed("ivs-card-item-category-name", true)
            .text(function() {
                return idMap.cat_1;
            });
        cate1.each(function(d) {
            var values = d.cat_1;
            if (values) {
                // Highlight target
                if (cat1Target) {
                    var catValues = cat1Target.map(function(d) { return d.toUpperCase(); });
                    for (var i = 0; i < values.length; i++) {
                        if (catValues.indexOf(values[i].toUpperCase()) !== -1) {
                            values[i] = "<b><font color=#333333>" + values[i] + "</font></b>";
                        }
                    }
                }
                d3.select(this).append("xhtml:div")
                    .classed("ivs-card-item-category-values", true)
                    .html(values.join(", "));
            } else {
                cate1.style("display", "none");
            }
        });
            
        // - Category 2
        var cate2 = cardContainer.append("xhtml:div")
            .classed("ivs-card-item-category", true);
        cate2.append("xhtml:div")
            .classed("ivs-card-item-category-name", true)
            .text(function() {
                return idMap.cat_2;
            });
        cate2.each(function(d) {
            var values = d.cat_2;
            if (values) {
                // Highlight target
                if (cat2Target) {
                    var catValues = cat2Target.map(function(d) { return d.toUpperCase(); });
                    for (var i = 0; i < values.length; i++) {
                        if (catValues.indexOf(values[i].toUpperCase()) !== -1) {
                            values[i] = "<b><font color=#333333>" + values[i] + "</font></b>";
                        }
                    }
                }
                d3.select(this).append("xhtml:div")
                    .classed("ivs-card-item-category-values", true)
                    .html(values.join(", "));
            } else {
                cate2.style("display", "none");
            }
        });
        
        // // - Content
        // cardContainer.append("xhtml:div")
            // .classed("ivs-card-item-content", true)
            // .text(function(d) {
                // return d.blurb;
            // });
            
        // - Notes
        cardContainer.append("xhtml:div")
            .classed("ivs-card-item-notes", true)
            .text(function(d) {
                return ivs.notesDict[d.id] ? ivs.notesDict[d.id].note : "";
            }).each(function(d) {
                d3.select(this).style("display", ivs.notesDict[d.id] ? "block" : "none");
            });
                
        // - Bottom curve
        // Classic vs. metro
        cardContainer.append("xhtml:div")
            .classed("ivs-card-item-bottom-curve", true);
    }
    
    /**
     * Add the given card, d is data, to this group.
     */
    function addCardToGroup(d) {
        // If the current page is full, just append the card without visual effect. Otherwise, update current page.
        data.push(d);
        
        if (endIndex - startIndex < maxNumCardsDisplay) {
            updateIndices(startIndex, endIndex + 1);
            var cards = cardGroup.selectAll("g").data(data.slice(startIndex, endIndex), key);
            
            // ENTER
            createEnterCards(cards, "add");
            
            // UPDATE
            setTimeout(function() { moveCardsToCentrePosition(cards); }, ivs.TRANSITION_MOVEMENT);
        }
        
        updateResultsInfo();
    }
    
    /**
     * Shift cards to the centre position.
     */
    function moveCardsToCentrePosition(cards) {
        cards.each(function(d, i) {
            var foreignObject = d3.select(this).select(".ivs-card-svg-item-fo");                
            foreignObject.transition().duration(ivs.TRANSITION_MOVEMENT)
                .attr("x", xPos(i, true));
        });
    }
    
    /**
     * Remove the given card, d is data, from the containing group.
     */
    function removeCardFromGroup(d) {
        // Remove from the entire data set
        data = data.filter(function(d2) {
            return d2.id !== d.id;
        });
        
        // Rebind data
        updateIndices(startIndex, Math.min(endIndex, data.length));
            
        var cards = cardGroup.selectAll("g").data(data.slice(startIndex, endIndex), key);
            
        // EXIT
        cards.exit()
            .transition().duration(ivs.TRANSITION_SHOW_HIDE)
            .style("opacity", 0)
            .remove();
        
        if (numCardsDisplay) {
            // ENTER
            createEnterCards(cards, "remove");
            
            // UPDATE
            moveCardsToCentrePosition(cards);

            updateResultsInfo();
        } else {
            gotoPreviousPage();
        }
        
        // This will be called when there is no result left
        updateResultsInfo();
    }
    
    /**
     * Check whether the current mouse point belongs to the given boundary.
     */
    function contains(bound) {
        // Use the height of the standard card. Somehow, the height of the whole is not very accurate.
        var p = { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY };
        
        return p.x <= bound.right && p.x >= bound.left && p.y <= bound.top + cardHeight * ivs.visScale && p.y >= bound.top;
    }
    
    /**
     * Transition effect and remove exit cards
     */
    function cleanExitCards(cards, transition) {
        var offset = transition === "next" ? -groupWidth : groupWidth;
        cards.exit()
            .each(function(d, i) {
                var foreignObject = d3.select(this).select(".ivs-card-svg-item-fo");
                foreignObject.transition().duration(ivs.TRANSITION_MOVEMENT)
                    .attr("x", xPos(i, false) + offset);                            
                d3.select(this)
                    .transition().delay(ivs.TRANSITION_MOVEMENT)
                    .remove();
            });
    }
    
    /**
     * Sets/gets the mapping between id and display name of fields.
     */
    module.idMap = function(value) {
        if (!arguments.length) return idMap;
        idMap = value;
        return this;
    };

    /**
     * Sets/gets the centre position of the cluster (in the middle and top of the cluster).  
     */
    module.topMiddlePosition = function(value) {
        if (!arguments.length) return topMiddlePosition;
        topMiddlePosition = value;
        return this;
    };
    
    /**
     * Sets/gets the search word or title of the cluster. 
     */
    module.searchWord = function(value) {
        if (!arguments.length) return searchWord;
        searchWord = value;
        return this;
    };

    /**
     * Sets/gets the target for categorical values 1 of the cluster. 
     */
    module.cat1Target = function(value) {
        if (!arguments.length) return cat1Target;
        cat1Target = value;
        return this;
    };
    
    /**
     * Sets/gets the target for categorical values 2 of the cluster. 
     */
    module.cat2Target = function(value) {
        if (!arguments.length) return cat2Target;
        cat2Target = value;
        return this;
    };
    
    /**
     * Gets the height of index-cards. 
     */
    module.cardHeight = function() {
        return cardHeight;
    };
    
    /**
     * Returns the name of visualisation.
     */
    module.visType = function() {
        return "card";
    };

    return module;
};