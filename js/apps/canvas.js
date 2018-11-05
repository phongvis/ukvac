/**
 * The main entry of the application. It combines toolbar, visualisations, and memory bar.
 */
ivs.apps.canvas = function() {
    var TOOLBAR_HEIGHT = 120,
        MEMORY_BAR_HEIGHT = 200,
        VIS_PADDING = 10,
        MEMORY_HEAD_WIDTH = 160,
        NONACTIVE_MEMORY_ITEM_HEIGHT = 18,
        GAP_BETWEEN_CENTRE_VISES = 50,
        NUM_TOP_AUTHORS_IN_SCATTER_PLOT = 20,
        NUM_TOP_AUTHORS_IN_BAR_CHART = 15,
        NUM_CO_AUTHORS = 20,
        width = 400,
        height = 300,
        visWidth = 600,
        visHeight = 400,
        numMaxVises = 2, // Maximum of vises displaying at the same time
        thumbnailHeight,
        thumbnailHeightInlcudingButtons,
        visTypeList = [
            { "name": "treemap", "imagePath": "../data/treemap.png" },
            { "name": "tree", "imagePath": "../data/tree.png" },
            { "name": "wordCloud", "imagePath": "../data/wordCloud.png" },
            { "name": "scatterPlot", "imagePath": "../data/scatterPlot.png" },
            { "name": "barChart", "imagePath": "../data/barChart.png" },
            { "name": "graph", "imagePath": "../data/graph.png" }
        ],
        dataSourceList = [
            { "name": "ACM CHI", "imagePath": "../data/acmchi.png" },
            { "name": "VAST Challenge 2013", "imagePath": "../data/vast2013.png", disabled: true }
        ],
        toolbar,
        numCollpasedVises = 0,
        container, 
        analysisContainer,
        bottomContainer,
        memoryHeadContainer,
        memoryHeads = [], // Array of foreignObject to store the heads of each memory band
        memoryBars = [], // 2D array of indices in vises
        memoryActiveRowIndex = 0,
        showAllButtonContainer,
        keywordData, 
        keywordOneLevelData,
        keywordFlatData,
        authorOneLevelData,
        vises = [], // Stores existing visualisations
        activeVises = [],
        memoryCollapsedMode = 0, // 0 = Show One
        movingList; // moving centre vises, not touch when switching collapsed memory mode

    var dispatch = d3.dispatch("dataLoaded");

    /**
     * Main entry of the module. This will be invoked by selection.call(template).
     * Note that only the first selected element can be created because variables are shared across selection.
     */
    function module(selection) {
        selection.each(function() {
            loadPrecomputedData();

            container = d3.select(this);
            buildVis();
            addHelp();
        });
    }

    function loadPrecomputedData() {
        ivs.data.dataProvider().loadPrecomputedData().on("keywordsLoaded", function(theData) {
            keywordData = theData;
        }).on("keywordsOneLevelLoaded", function(theData) {
            keywordOneLevelData = theData;
        }).on("flatKeywordsLoaded", function(theData) {
            keywordFlatData = theData;
        }).on("authorsOneLevelLoaded", function(theData) {
            authorOneLevelData = theData;
        });
    }

    /**
     * Build the visualisation. 
     */
    function buildVis() {
        // Bottom is the memory bar
        bottomContainer = container.append("rect")
            .classed("ivs-memory-bar", true)
            .attr("width", width);
        
        var showAllButton = ivs.widgets.cycleButton()
            .texts(["Show All", "Show One"])
            .on("indexChanged", function(index) {
                memoryCollapsedMode = index;
                onShowHideMemoryChanged();
            });
        showAllButtonContainer = container.append("g").attr("transform", "translate(" + (width - 70) + "," + (height - 3) + ")").style("opacity", 0).call(showAllButton);

        memoryHeadContainer = container.append("g");

        // Middle is the analysis space
        analysisContainer = container.append("g")
            .attr("transform", "translate(0," + TOOLBAR_HEIGHT + ")");

        // Top is the toolbar
        var dropVis;
        toolbar = ivs.vises.toolbar().width(width).height(TOOLBAR_HEIGHT)
            .on("dataVisTypeDropped", function(e) { // New vis
                createNewVis(e.visType, { "text": e.dataSource });
            }).on("visTypeOnlyDragged", function(e) { // Provide feedback
                dropVis = null;
                // Check if dropped onto the existing visualisation
                for (var i = 0; i < vises.length; i++) {
                    if (!vises[i]) { continue; }

                    if (vises[i].container.node().containsPoint(e.pos)) {
                        if (e.visType !== vises[i].vis.visType()) { // Different vis type
                            // Same group
                            if (["treemap", "tree"].indexOf(vises[i].vis.visType()) !== -1) {
                                if (["treemap", "tree"].indexOf(e.visType) !== -1) {
                                    dropVis = vises[i];
                                }
                            }
                            if (["scatterPlot"].indexOf(vises[i].vis.visType()) !== -1) {
                                if (["scatterPlot"].indexOf(e.visType) !== -1) {
                                    dropVis = vises[i];
                                }
                            }
                        }

                        break;
                    }
                }

                ivs.updatePlusIcon(dropVis ? 1 : 0, e.pos.x, e.pos.y);
            }).on("visTypeOnlyDropped", function(e) {  // Update vis type
                if (dropVis) {
                    updateVisType(dropVis, e.visType);                    
                }

                ivs.updatePlusIcon(0);
            });
        
        container.append("g").datum([dataSourceList, visTypeList]).call(toolbar);

        // Click onto empty space, deselect everything
        d3.select(container.node().parentNode).on("click", function() {
            if (isOverEmptySpace({ x: d3.event.pageX, y: d3.event.pageY }, false)) {
                ivs.app.selectionManager.clearSelection();
            }
        });
    }

    function createNewVis(visType, dataSource, trigger, starred, rowIndex, hidden) {
        var vis = getVis(visType)
            .id(vises.length)
            .width(visWidth)
            .height(visHeight);
        if (starred) {
            vis.starred(true);
            vis.memoryRowIndex(rowIndex);
            vis.hidden = hidden; // Notes that vis will be created async. all params will be overriden. 
        }
        var pos = starred ? module.getCollapsedPosition(vis) : module.getCentrePosition();
        vises.push( { vis: vis, container: analysisContainer.append("g").attr("transform", "translate(" + pos + ")") });
        vis.pos = pos;
        registerEvents(vis);

        module.on("dataLoaded", function(e) {
            e.vis.spinner.stop();

            var vis = e.vis;
            var visObject = vises[vis.id()];

            // Special assignment for card
            if (vis.visType() === "card") {
                e = e.data;
                vis .idMap(e.id_map)
                    .topMiddlePosition({ x: vis.pos[0] - visWidth / 2, y: vis.pos[1] })
                    .searchWord(trigger);
            }

            // New g for the vis
            visObject.container.datum(e.data).call(vis);

            if (starred) {
                vis.collapse(vis.hidden);
            } else {
                onVisActivated(vis.id());
            }
        });

        // Data will be returned by dataLoaded event
        var spinner = ivs.widgets.spinner();
        container.call(spinner);
        var pos = module.getCentrePosition();
        pos[0] += visWidth / 2;
        pos[1] += TOOLBAR_HEIGHT + visHeight / 2;
        spinner.spin(pos[0], pos[1]);
        vis.spinner = spinner;

        if (!getData(vis, visType, dataSource, trigger)) {
            spinner.stop();
        }

        return vis.id();
    }

    function updateVisType(dropVis, visType) {
        var oldVis = dropVis.vis;
        
        // Copy attributes
        dropVis.vis = getVis(visType)
            .id(oldVis.id())
            .width(oldVis.width())
            .height(oldVis.height())
            .translate(oldVis.translate())
            .scale(oldVis.scale())
            .dataSource(oldVis.dataSource())
            .activeMappingIndex(oldVis.activeMappingIndex())
            .collapsed(oldVis.collapsed());
        registerEvents(dropVis.vis);

        dropVis.container.selectAll("g").remove();
        dropVis.container.datum(oldVis.data()).call(dropVis.vis);

        // Remain activeVis
        for (var i = 0; i < activeVises.length; i++) {
            if (oldVis.id() === activeVises[i].id()) {
                activeVises[i] = dropVis.vis;
                break;
            }
        }
    }

    function getVis(visType) {
        if (visType === "treemap") { return ivs.vises.treemap(); }
        if (visType === "tree") { return ivs.vises.tree(); }
        if (visType === "wordCloud") { return ivs.vises.wordCloud(); }
        if (visType === "scatterPlot") { return ivs.vises.scatterPlot(); }
        if (visType === "barChart") { return ivs.vises.barChart(); }
        if (visType === "card") { return ivs.vises.card(); }
        if (visType === "graph") { return ivs.vises.graph(); }
    }

    /**
     * Returns the appropriate data based on given visType and dataType.
     */
    function getData(vis, visType, dataSource, trigger, cloning) {
        var dataSource = ivs.helpers.basic.deepCopy(dataSource);
        var leaf = dataSource;
        while (leaf.child) {
            leaf = leaf.child;
        }
        dataSource.itemMappings = null;

        // 5 levels of dataType: null -> database -> keywords -> authors -> (years) -> articles
        // Base on the existing data type, derive its child in the hierarchy
        if (!leaf.dataType) { // Overview of database
            leaf.dataType = "database";
            if (visType === "treemap") {
                dataSource.itemMappings = ["keywords", "authors"];
                vis.dataSource(dataSource).attributeMappings([
                    { "name": "Total publications", "value": function(d) { return +d.pubs; } },
                    { "name": "Total citations", "value": function(d) { return +d.cites; } }
                ]);
                dispatch.dataLoaded( { data: keywordOneLevelData, vis: vis });
            } else if (visType === "tree") {
                dataSource.itemMappings = ["keywords"];
                vis.dataSource(dataSource).attributeMappings([
                    { "name": "Total publications", "value": function(d) { return +d.pubs; } },
                    { "name": "Total citations", "value": function(d) { return +d.cites; } }
                ]);
                dispatch.dataLoaded( { data: keywordData, vis: vis });
            } else if (visType === "wordCloud") {
                dataSource.itemMappings = ["keywords"];
                vis.dataSource(dataSource);
                dispatch.dataLoaded( { data: keywordFlatData, vis: vis });
            }
        } else if (leaf.dataType === "database") { // Second level: keywords -> authors/articles
            // dataType of this level is based on the mapping the user chose
            leaf.child = { "text": trigger[0], "dataType": dataSource.activeMapping };
            if (visType === "scatterPlot") {
                if (leaf.child.dataType === "keywords") { // keywords -> authors
                    dataSource.itemMappings = ["authors"];
                    vis.dataSource(dataSource).attributeMappings([
                        { "name": "Total publications", "value": function(d) { return +d.x; } },
                        { "name": "Total citations", "value": function(d) { return +d.y; } }
                    ]);
                    ivs.data.dataProvider().aggregateData(trigger[0])
                        .on("arregateCompleted", function(theData) {
                            dispatch.dataLoaded( { data: theData, vis: vis });
                        });
                } 
            } else if (visType === "barChart") {
                if (leaf.child.dataType === "keywords") { // keywords -> authors
                    dataSource.itemMappings = ["authors"];
                    vis.dataSource(dataSource).attributeMappings([
                        { "name": "Total publications", "value": function(d) { return +d.x; } },
                        { "name": "Total citations", "value": function(d) { return +d.y; } }
                    ]);
                    ivs.data.dataProvider().aggregateData(trigger[0], NUM_TOP_AUTHORS_IN_BAR_CHART)
                        .on("arregateCompleted", function(theData) {
                            dispatch.dataLoaded( { data: theData, vis: vis });
                        });  
                }
            } else if (visType === "card") { // articles having keywords
                leaf.child.text = trigger.join(" & ");
                dataSource.itemMappings = ["articles"];
                vis.dataSource(dataSource);
                vis.cat2Target(trigger);
                var filter = [ { "field": leaf.child.dataType, "values": trigger } ];
                ivs.data.dataProvider().individualData(filter, visType)
                    .on("searchCompleted", function(theData) {
                        dispatch.dataLoaded( { data: theData, vis: vis });
                    });
            } else if (visType === "wordCloud" && dataSource.activeMapping === "authors") { // authors -> keywords
                dataSource.itemMappings = ["keywords"];
                vis.dataSource(dataSource);
                var filter = [ { "field": "authors", "values": trigger } ];
                ivs.data.dataProvider().keywordFrequencyData(filter)
                    .on("keywordFrequencyCompleted", function(theData) {
                        dispatch.dataLoaded( { data: theData, vis: vis });
                    });
            }
        } else if (leaf.dataType === "keywords") { // Third level: authors -> articles
            leaf.child = { "text": trigger.join(" & "), "dataType": dataSource.activeMapping };
            // Articles having keywords
            var filter = [ { "field": leaf.dataType, "values": [leaf.text] } ];
            // and belong to authors
            filter.push({ "field": leaf.child.dataType, "values": trigger });
            
            if (visType === "scatterPlot") { 
                dataSource.itemMappings = ["articles"];
                vis.dataSource(dataSource).attributeMappings([
                    { "name": "Year", "value": function(d) { return +d.x; } },
                    { "name": "Citations", "value": function(d) { return +d.y; } }
                ]);
                ivs.data.dataProvider().individualData(filter, visType)
                    .on("searchCompleted", function(theData) {
                        dispatch.dataLoaded( { data: theData, vis: vis });
                    });
            } else if (visType === "barChart") {
                dataSource.itemMappings = ["articles by year"];
                vis.dataSource(dataSource).attributeMappings([
                    { "name": "Total publications", "value": function(d) { return +d.pubs; } },
                    { "name": "Total citations", "value": function(d) { return +d.cites; } }
                ]);
                
                ivs.data.dataProvider().individualData(filter, visType)
                    .on("searchCompleted", function(theData) {
                        dispatch.dataLoaded( { data: theData, vis: vis });
                    });
            } else if (visType === "card") {
                dataSource.itemMappings = ["articles"];
                vis.dataSource(dataSource);
                vis.cat1Target(trigger);
                vis.cat2Target(leaf.text.split(" & "));
                ivs.data.dataProvider().individualData(filter, visType)
                    .on("searchCompleted", function(theData) {
                        dispatch.dataLoaded( { data: theData, vis: vis });
                    });
            } else if (visType === "graph") { // authors -> authors
                dataSource.itemMappings = ["authors"];
                vis.dataSource(dataSource);
                ivs.data.dataProvider().authorGraphData(filter, NUM_CO_AUTHORS)
                    .on("graphDataLoaded", function(theData) {
                        dispatch.dataLoaded( { data: theData, vis: vis });
                    });
            } else if (visType === "wordCloud") { // authors -> keywords
                dataSource.itemMappings = ["keywords"];
                vis.dataSource(dataSource);
                ivs.data.dataProvider().keywordFrequencyData(filter)
                    .on("keywordFrequencyCompleted", function(theData) {
                        dispatch.dataLoaded( { data: theData, vis: vis });
                    });
            }
        } else if (leaf.dataType === "authors") { // Fourth level
            var filter = [ { "field": leaf.dataType, "values": leaf.text.split(" & ") } ];
            filter.push({ "field": dataSource.child.dataType, "values": dataSource.child.text.split(" & ") });

            if (dataSource.activeMapping === "articles") { // One article: replace "articles" with article title
                dataSource.itemMappings = trigger;
                filter.push({ "field": dataSource.activeMapping, "values": trigger });
            } else if (dataSource.activeMapping === "articles by year") { // Articles in this year
                dataSource.itemMappings = ["aricles"];

                // Add new level
                leaf.child = { "text": trigger.join(" & "), "dataType": dataSource.activeMapping };
                filter.push({ "field": "year", "values": trigger });
            } else if (dataSource.activeMapping === "authors") { // Different author: change it in the 3rd level
                dataSource.child.child.text = trigger.join(" & ");
                dataSource.itemMappings = visType === "graph" ? ["authors"] : ["articles"];

                if (visType === "scatterPlot") {
                    vis.dataSource(dataSource).attributeMappings([
                        { "name": "Year", "value": function(d) { return +d.x; } },
                        { "name": "Citations", "value": function(d) { return +d.y; } }
                    ]);
                    ivs.data.dataProvider().individualData(filter, visType)
                        .on("searchCompleted", function(theData) {
                            dispatch.dataLoaded( { data: theData, vis: vis });
                        });
                } else if (visType === "barChart") {
                    vis.dataSource(dataSource).attributeMappings([
                        { "name": "Total publications", "value": function(d) { return +d.pubs; } },
                        { "name": "Total citations", "value": function(d) { return +d.cites; } }
                    ]);
                    
                    ivs.data.dataProvider().individualData(filter, visType)
                        .on("searchCompleted", function(theData) {
                            dispatch.dataLoaded( { data: theData, vis: vis });
                        });
                } else if (visType === "graph") {
                    vis.dataSource(dataSource);
                    ivs.data.dataProvider().authorGraphData(filter, NUM_CO_AUTHORS)
                        .on("graphDataLoaded", function(theData) {
                            dispatch.dataLoaded( { data: theData, vis: vis });
                        });
                }
            }
            
            if (visType === "card") {
                vis.cat1Target(leaf.text.split(" & "));
                vis.cat2Target(dataSource.child.text.split(" & "));
                vis.dataSource(dataSource);
                ivs.data.dataProvider().individualData(filter, visType)
                    .on("searchCompleted", function(theData) {
                        dispatch.dataLoaded( { data: theData, vis: vis });
                    });
            }
        }

        return dataSource.itemMappings;
    }

    function registerEvents(vis) {
        vis .on("visRemoved", onVisRemoved)
            .on("visActivated", onVisActivated)
            .on("visCollapsed", onVisCollapsed)
            .on("itemDragged", onItemDragged)
            .on("itemDropped", onItemDropped)
            .on("dataMappingChanged", onDataMappingChanged);
    }

    function onVisRemoved(id) {
        var starred = vises[id].vis.starred();
        vises[id] = null;

        // Shift left all vises from the right side
        var count = 0;
        for (var i = id; i < vises.length; i++) {
            if (!vises[i] || !vises[i].vis.collapsed() || (starred !== vises[i].vis.starred())) { continue; }

            var t = d3.transform(vises[i].container.attr("transform")).translate;
            t[0] -= getCollapsedVisWidth();
            vises[i].container.transition().duration(ivs.TRANSITION_MOVEMENT).attr("transform", "translate(" + t + ")");
        };

        if (starred) {
            // Remove linked vises
            // - Find which column the removed vis is
            var column = -1;
            for (var i = 0; i < memoryBars.length; i++) {
                if (memoryBars[i].indexOf(id) !== -1) {
                    column = memoryBars[i].indexOf(id);
                }
            }
            // - Remove all vises in that column
            for (var i = 0; i < memoryBars.length; i++) {
                var idx = memoryBars[i][column];
                vises[idx] = null;
                memoryBars[i].splice(column, 1);
            }
            // - Remove heads
            if (memoryBars.length && memoryBars[0].length === 0) {
                memoryBars = [];
                for (var i = 0; i < memoryHeads.length; i++) {
                    memoryHeads[i].remove();
                }
                memoryHeads = [];
                memoryActiveRowIndex = 0;

                // Update memory bar background
                bottomContainer.attr("height", 0);
                showAllButtonContainer.style("opacity", 0);
            }
        }

        module.rearrangeCentreVises(id);

        // Remove activeVis if needed
        for (var i = 0; i < activeVises.length; i++) {
            if (id === activeVises[i].id()) {
                activeVises.splice(i, 1);
                break;
            }
        }
    }

    function onVisActivated(id) {
        // Collapse left-most activeVis if there is no more space
        var spaceAvailable = activeVises.length < numMaxVises;
        if (!spaceAvailable) {
            var activeVis = activeVises[0];
            if (activeVis && !activeVis.floating()) {
                var hidden = false;
                if (activeVis.starred()) {
                    var currentActiveVisId = activeVis.id();
                    if (wasBeingBookmarked(currentActiveVisId)) { // Already bookmark, just collapse it
                        hidden = activeVis.memoryRowIndex() !== memoryActiveRowIndex;
                    } else {
                        if (module.validateBookmark(currentActiveVisId)) { // Let's bookmark
                            setTimeout(function() {
                                addToMemoryBar(currentActiveVisId);
                            }, ivs.TRANSITION_MOVEMENT);
                        } else {
                            activeVis.starred(false); // Not invalid to bookmark, de-star it    
                        }
                    }
                } 

                activeVis.collapse(hidden);
            }
        }

        // Shift left existing centre vises
        module.rearrangeCentreVises(-1);

        // Update activeVis
        if (!spaceAvailable) {
            activeVises.shift();
        }
        activeVises.push(vises[id].vis);

        // Switch to show one
        if (memoryCollapsedMode === 1) {
            memoryCollapsedMode = 0;
            onShowHideMemoryChanged(id);
        }
    }

    function onVisCollapsed(id) {
        // Set activeVises to null if needed
        for (var i = 0; i < activeVises.length; i++) {
            if (id === activeVises[i].id()) {
                activeVises.splice(i, 1);
                break;
            }
        }

        if (vises[id].vis.starred()) {
            addToMemoryBar(id);
        }
    }

    function wasBeingBookmarked(id) {
        for (var i = 0; i < memoryBars.length; i++) {
            for (var j = 0; j < memoryBars[i].length; j++) {
                if (id === memoryBars[i][j]) {
                    return true;
                }
            }
        }

        return false;
    }

    function addToMemoryBar(id) {
        var vis = vises[id].vis;
        var leaf = vis.dataSource();
        while (leaf.child) {
            leaf = leaf.child;
        }
        
        if (memoryBars.length === 0) { // If the memory bar is empty, add new memory head
            addNewMemoryHead(leaf.text);
            memoryBars.push([id]);
        } else {
            var rowIndex = vis.memoryRowIndex() === -1 ? memoryActiveRowIndex : vis.memoryRowIndex();
            var bar = memoryBars[rowIndex];
            if (bar.indexOf(vis.id()) === -1) { 
                // Add new id if it doesn't exist
                bar.push(id);

                // Replicate for others
                for (var i = 0; i < memoryBars.length; i++) {
                    if (i === rowIndex) { continue; }

                    // Reset dataSource to the parent
                    var dataSource = ivs.helpers.basic.deepCopy(vis.dataSource());
                    var leaf = dataSource;
                    while (leaf.child) {
                        parent = leaf;
                        leaf = leaf.child;
                    }
                    parent.child = null;

                    var trigger = [memoryHeads[i].select(".ivs-canvas-memory-head-text").text()];
                    memoryBars[i].push(createNewVis(vis.visType(), dataSource, trigger, true, i, true));
                }
            }
        }
    }

    function addNewMemoryHead(text) {
        var h = getMemoryHeight(memoryActiveRowIndex, memoryActiveRowIndex) + 5;
        var y = height - h;

        var g = memoryHeadContainer.append("g")
            .attr("transform", "translate(0," + (y - 2) + ")");
        g.append("rect")
            .attr("width", width)
            .attr("height", thumbnailHeightInlcudingButtons)
            .classed("background", true)
            .style("pointer-events", "none") // To allow event pass through the background
            .attr("opacity", 0);
        g.on("mouseover", function() {
            d3.select(this).select("image").style("opacity", 1);
        }).on("mouseout", function() {
            d3.select(this).select("image").style("opacity", 0);
        });
        memoryHeads.push(g);

        // Title
        g.append("foreignObject")
            .attr("width", MEMORY_HEAD_WIDTH)
            .attr("height", thumbnailHeightInlcudingButtons)
            .attr("transform", "translate(0," + thumbnailHeightInlcudingButtons / 2 + ")")
            .classed("ivs-memory-head", true)
                .append("xhtml:span")
                .classed("ivs-canvas-memory-head-text", true)
                .text(text)
                .attr("index", memoryActiveRowIndex)
                .on("click", function() {
                    var oldActiveIndex = memoryActiveRowIndex;
                    memoryActiveRowIndex = +d3.select(this).attr("index");
                    arrangeMemoryBarPositions(oldActiveIndex);
                });

        // Remove icon
        g.append("image")
            .classed("ivs-canvas-remove-icon", true)
            .attr("transform", "translate(0," + thumbnailHeightInlcudingButtons / 2 + ")")
            .attr("index", memoryActiveRowIndex)
            .attr("xlink:href", "../data/remove.png")
            .attr("x", 3)
            .attr("y", 3)
            .attr("width", 10)
            .attr("height", 10)
            .style("opacity", 0)
            .on("mouseover", function() { d3.select(this).style("cursor", "pointer"); })
            .on("mouseout", function() { d3.select(this).style("cursor", "default"); })
            .on("click", function() {
                var idx = +d3.select(this).attr("index");
                // Remove cloned vises in that row
                for (var i = 0; i < memoryBars[idx].length; i++) {
                    vises[memoryBars[idx][i]].vis.remove();
                    vises[memoryBars[idx][i]] = null;
                }

                // Stores old memory heights for re-arranging. Need to compute before remove memory items.
                var heights = [];
                for (var i = 0; i < memoryBars.length; i++) {
                    heights[i] = getMemoryHeight(i, memoryActiveRowIndex);
                }

                // Remove bar, head
                var oldActiveIndex = memoryActiveRowIndex;
                if (idx < memoryActiveRowIndex) {
                    memoryActiveRowIndex--;
                } else if (idx === memoryActiveRowIndex) {
                    if (idx > 0) {
                        memoryActiveRowIndex--;
                    } else if (memoryBars.length === 1) { // The only one row
                        memoryActiveRowIndex--;
                    }
                }
                memoryHeads[idx].remove();
                memoryBars.splice(idx, 1);
                memoryHeads.splice(idx, 1);
                heights.splice(idx, 1);

                var offsets = [];
                for (var i = 0; i < memoryBars.length; i++) {
                    offsets[i] = getMemoryHeight(i, memoryActiveRowIndex) - heights[i];
                }
                arrangeMemoryBarPositionsByOffsets(offsets);

                // Update memory bar background
                var h = getMemoryHeight(memoryBars.length - 1, memoryActiveRowIndex) + 5;
                if (memoryActiveRowIndex === -1) {
                    memoryActiveRowIndex = 0;
                    h = 0;
                    showAllButtonContainer.style("opacity", 0);
                }
                bottomContainer
                    .transition().duration(ivs.TRANSITION_MOVEMENT)
                    .attr("transform", "translate(0," + (height - h) + ")")
                    .attr("height", h);

                // Modify index attribute
                memoryHeadContainer.selectAll("image.ivs-canvas-remove-icon").each(function(d) {
                    var myIndex = +d3.select(this).attr("index");
                    if (myIndex > idx) {
                        d3.select(this).attr("index", myIndex - 1);
                    }
                });
            });

        // Line on top to separate
        g.append("rect")
            .attr("width", width)
            .attr("height", 2)
            .attr("y", -3)
            .classed("line", true)
            .style("fill", "white")
            .style("opacity", 0);

        // Update memory bar background
        bottomContainer
            .attr("transform", "translate(0," + (height - h) + ")")
            .attr("height", h);
        showAllButtonContainer.style("opacity", 1);
    }

    function updateMemoryHeadPosition(idx) {
        if (memoryHeads[idx]) {
            // Translate the grop 
            var y = height - getMemoryHeight(idx, memoryActiveRowIndex);
            memoryHeads[idx]
                .transition().duration(ivs.TRANSITION_MOVEMENT)
                .attr("transform", "translate(0," + (y - 2) + ")");

            // Adjust background height
            memoryHeads[idx].select(".background")
                .attr("height", idx === memoryActiveRowIndex ? thumbnailHeightInlcudingButtons : NONACTIVE_MEMORY_ITEM_HEIGHT);

            // Translate title + image to the middle
            var h = idx === memoryActiveRowIndex ? thumbnailHeightInlcudingButtons / 2 : 0;
            memoryHeads[idx].select(".ivs-memory-head")
                .attr("height", idx === memoryActiveRowIndex ? thumbnailHeightInlcudingButtons : NONACTIVE_MEMORY_ITEM_HEIGHT)
                .transition().duration(ivs.TRANSITION_MOVEMENT).attr("transform", "translate(0," + h + ")");
            memoryHeads[idx].select("image")
                .transition().duration(ivs.TRANSITION_MOVEMENT).attr("transform", "translate(0," + h + ")");

            // Hide top line
            memoryHeads[idx].select(".line")    
                .style("opacity", idx === memoryBars.length - 1 ? 0 : 1);
        }
    }

    function onItemDragged(e) {
        // Drag over toolbar first
        if (!toolbar.getHoveredVisType(e)) {
            // Drag over memory bar
            if (!isOverMemoryBar(e.pos)) {
                // Drag over empty space
                isOverEmptySpace(e.pos, true);
            } else {
                ivs.updateSearchIcon(0);
            }
        }
    }

    function isOverMemoryBar(pos) {
        var isOver = container.select(".ivs-memory-bar").node().containsPoint(pos);
        ivs.updateCloneIcon(isOver ? 1 : 0, pos.x , pos.y);

        return isOver;
    }

    function onItemDropped(e) {
        var visType = toolbar.getHoveredVisType(e);
        if (visType) { // Check drop over toolbar first
            createNewVis(visType, e.dataSource, e.name);
        } else if (container.select(".ivs-memory-bar").node().containsPoint(e.pos)) { // Check drop over memory bar
            cloneVises(e);
        } else if (isOverEmptySpace(e.pos, true)) { // Search for keyword if drop onto empty space
            createNewVis("card", e.dataSource, e.name);
        }

        ivs.updatePlusIcon(0);
        ivs.updateCloneIcon(0);
        ivs.updateSearchIcon(0);
    }

    function cloneVises(e) {
        var oldActiveIndex = memoryActiveRowIndex;

        // Clone all vises in the active memory bar with the new drop info
        for (var r = 0; r < e.name.length; r++) {
            var rowIndex = memoryBars.length;
            var ids = [];
            memoryBars.push(ids);

            for (var i = 0; i < memoryBars[memoryActiveRowIndex].length; i++) {
                var id = memoryBars[memoryActiveRowIndex][i];
                var vis = vises[id].vis;

                // Reset dataSource to the parent
                var dataSource = ivs.helpers.basic.deepCopy(vis.dataSource());
                var leaf = dataSource;
                var parent;
                while (leaf.child) {
                    parent = leaf;
                    leaf = leaf.child;
                }
                parent.child = null;

                ids.push(createNewVis(vis.visType(), dataSource, [e.name[r]], true, rowIndex, r !== e.name.length - 1));
            }

            // The last one becomes active
            memoryActiveRowIndex = rowIndex;

            // Head for the new memory row
            addNewMemoryHead(e.name[r]);
        }

        // Re-arrange bars position and visibility
        arrangeMemoryBarPositions(oldActiveIndex);

        // Update memory bar background
        var h = getMemoryHeight(memoryActiveRowIndex, memoryActiveRowIndex) + 5;
        bottomContainer
            .transition().duration(ivs.TRANSITION_MOVEMENT)
            .attr("transform", "translate(0," + (height - h) + ")")
            .attr("height", h);
    }

    function onShowHideMemoryChanged(exceptedId) {
        if (memoryCollapsedMode === 1) { // Show all
            // Find scale
            var maxWidth = (width - MEMORY_HEAD_WIDTH - VIS_PADDING) / memoryBars[0].length - VIS_PADDING * 3;
            var maxHeight = (height - VIS_PADDING - TOOLBAR_HEIGHT) / memoryBars.length - ivs.INFO_PANEL_HEIGHT - VIS_PADDING;
            var newScale = Math.min(maxWidth / visWidth, maxHeight / visHeight);
            var newWidth = Math.round(visWidth * newScale) + VIS_PADDING * 3;
            var newHeight = Math.round(visHeight * newScale) + ivs.INFO_PANEL_HEIGHT + VIS_PADDING;
            var yOffset = height - VIS_PADDING - TOOLBAR_HEIGHT - newHeight * memoryBars.length;
            
            // Translate/scale/change opacity
            for (var i = 0; i < memoryBars.length; i++) {
                for (var j = 0; j < memoryBars[i].length; j++) {
                    vises[memoryBars[i][j]].vis.transform([newWidth * j + MEMORY_HEAD_WIDTH + VIS_PADDING, yOffset + newHeight * (memoryBars.length - i - 1) + VIS_PADDING + ivs.INFO_PANEL_HEIGHT], newScale, 1);
                }
            }

            for (var i = 0; i < memoryHeads.length; i++) {
                // Change height of memory head background
                memoryHeads[i].select(".background").attr("height", newHeight);

                // Translate memory heads
                var y = height - (i + 1) * newHeight;
                memoryHeads[i]
                    .transition().duration(ivs.TRANSITION_MOVEMENT)
                    .attr("transform", "translate(0," + (y - 2) + ")");
                memoryHeads[i].select(".ivs-memory-head")
                    .attr("height", newHeight)
                    .transition().duration(ivs.TRANSITION_MOVEMENT)
                    .attr("transform", "translate(0," + (newHeight / 2 - 20) + ")");
            }

            // Make the memory bar cover everything
            var newBackgroundHeight = newHeight * memoryBars.length + 5;
            bottomContainer.attr("height", newBackgroundHeight)
                .transition().duration(ivs.TRANSITION_MOVEMENT)
                .attr("transform", "translate(0," + (TOOLBAR_HEIGHT + 5 + yOffset) + ")");

            // Hide all non-star vises
            for (var i = 0; i < vises.length; i++) {
                if (vises[i] && !vises[i].vis.starred()) {
                    vises[i].vis.show(0);
                }
            }

            // Set full source info
            for (var i = 0; i < memoryHeads.length; i++) {
                memoryHeads[i].select(".ivs-canvas-memory-head-text").text(vises[memoryBars[i][0]].vis.getFullSourceInfo());
            }
        } else { // Show one
            // Translate/scale/change opacity
            for (var i = 0; i < memoryBars.length; i++) {
                for (var j = 0; j < memoryBars[i].length; j++) {
                    if (memoryBars[i][j] !== exceptedId) {
                        var pos = module.getCollapsedPosition(vises[memoryBars[i][j]].vis);
                        vises[memoryBars[i][j]].vis.transform(pos, ivs.THUMBNAIL_RATIO, i === memoryActiveRowIndex ? 1 : 0);
                    }
                }
            }
            
            for (var i = 0; i < memoryHeads.length; i++) {
                updateMemoryHeadPosition(i);
            }

            // Update memory bar background
            var h = getMemoryHeight(memoryBars.length - 1, memoryActiveRowIndex) + 5;
            bottomContainer
                .transition().duration(ivs.TRANSITION_MOVEMENT)
                .attr("transform", "translate(0," + (height - h) + ")")
                .attr("height", h);

            // Show all non-star vises
            for (var i = 0; i < vises.length; i++) {
                if (vises[i] && !vises[i].vis.starred()) {
                    if (exceptedId == undefined || movingList.indexOf(vises[i].vis.id()) === -1) {
                        vises[i].vis.show(1);
                    }
                }
            }

            // Set only leaf
            for (var i = 0; i < memoryHeads.length; i++) {
                memoryHeads[i].select(".ivs-canvas-memory-head-text").text(vises[memoryBars[i][0]].vis.getDataSourceLeafText());
            }
        }
    }

    function arrangeMemoryBarPositions(oldActiveIndex) {
        // var offsets = [];
        // for (var i = 0; i < memoryBars.length; i++) {
        //     offsets[i] = getMemoryHeight(i, memoryActiveRowIndex) - getMemoryHeight(i, oldActiveIndex);
        // }

        // arrangeMemoryBarPositionsByOffsets(offsets);

        for (var i = 0; i < memoryBars.length; i++) {
            for (var j = 0; j < memoryBars[i].length; j++) {
                var pos = module.getCollapsedPosition(vises[memoryBars[i][j]].vis);
                vises[memoryBars[i][j]].vis.transform(pos, ivs.THUMBNAIL_RATIO, i === memoryActiveRowIndex ? 1 : 0);
            }

            updateMemoryHeadPosition(i);
        }

        for (var j = 0; j < memoryBars[memoryActiveRowIndex].length; j++) {
            vises[memoryBars[memoryActiveRowIndex][j]].container.moveToFront();
        }
    }

    function arrangeMemoryBarPositionsByOffsets(offsets) {
        for (var i = 0; i < memoryBars.length; i++) {
            // Translate from old pos to new pos
            for (var j = 0; j < memoryBars[i].length; j++) {
                var id = memoryBars[i][j];
                if (vises[id].vis.collapsed()) {
                    vises[id].vis.transformByOffset([0, -offsets[i]], i === memoryActiveRowIndex ? 1 : 0);
                }
            }

            // Memory head
            updateMemoryHeadPosition(i);
        }
    }

    function getMemoryHeight(idx, activeIndex) {
        return idx * NONACTIVE_MEMORY_ITEM_HEIGHT + (idx < activeIndex ? NONACTIVE_MEMORY_ITEM_HEIGHT : thumbnailHeightInlcudingButtons);
    }

    function isOverEmptySpace(pos, updateIcon) {
        var isOver = true;

        if (container.select(".ivs-toolbar").node().containsPoint(pos) || container.select(".ivs-memory-bar").node().containsPoint(pos)) {
            isOver = false;
        } else {
            for (var i = 0; i < vises.length; i++) {
                if (vises[i] && vises[i].container.node().containsPoint(pos)) { // Check drop onto empty space
                    isOver = false;
                    break;
                }
            }
        }

        if (updateIcon) { 
            ivs.updateSearchIcon(isOver ? 1 : 0, pos.x, pos.y);
        }

        return isOver;
    }

    function onDataMappingChanged(id) {
        var visObject = vises[id];
        var vis = visObject.vis;

        // Quick approach for treemap, static data only
        if (vis.visType() === "treemap") {
            if (vis.activeMapping() === "authors") {
                visObject.container.datum(authorOneLevelData).call(vis);
            } else if (vis.activeMapping() === "keywords") {
                visObject.container.datum(keywordOneLevelData).call(vis);
            }
        }
    }

    /**
     * Validates if it's possible to bookmark the given vis.
     */
    module.validateBookmark = function(id) {
        // Always possible to bookmark if memory bar is empty
        if (memoryBars.length === 0) {
            return true;
        }

        var activeTarget = memoryHeads[memoryActiveRowIndex].select(".ivs-canvas-memory-head-text").text();

        // New target
        var vis = vises[id].vis;
        var leaf = vis.dataSource();
        while (leaf.child) {
            leaf = leaf.child;
        }

        if (leaf.text !== activeTarget) {
            ivs.errorMessage = "Cannot save a visualisation of <b>" + leaf.text + "</b> into an existing memory of <b>" + activeTarget + "</b>";
        }

        return leaf.text === activeTarget;
    };

    /**
     * Rearrange centre vises when new vises added or removed.
     * id = -1 if added.
     * id >= 0 means the id of removed vis.
     * The function should be called before activeVises updated.
     */
    module.rearrangeCentreVises = function(id) {
        var appended = id === -1;
        var idx = -1;
        if (!appended) {
            for (var i = 0; i < activeVises.length; i++) {
                if (id === activeVises[i].id()) {
                    idx = i;
                    break;
                }
            }

            if (idx === -1) {
                return;
            }
        }

        movingList = [];
        var startIdx = !appended || (appended && activeVises.length < numMaxVises) ? 0 : 1; // Ignore the will-be-collapsed first vis
        for (var i = startIdx; i < activeVises.length; i++) {
            var currentPos = getXPosOfCentreVis(i, activeVises.length);
            var newPos;

            if (appended) {
                newPos = getXPosOfCentreVis(i - startIdx, activeVises.length + 1 - startIdx);
            } else {
                if (i < idx) { 
                    newPos = getXPosOfCentreVis(i, activeVises.length - 1);
                } else if (i > idx) {
                    newPos = getXPosOfCentreVis(i - 1, activeVises.length - 1);
                } else {
                    continue;
                }
            }

            movingList.push(activeVises[i].id());
            activeVises[i].transformByOffset([newPos - currentPos, 0], 1);
        }
    }

    /**
     * Returns the active row index in the memory bar.
     */
    module.getMemoryActiveRowIndex = function() {
        return memoryActiveRowIndex;
    }

    /**
     * Returns the position of the given vis in the collapsed arrangement.
     */
    module.getCollapsedPosition = function(vis) {
        var index = id = vis.id(), 
            y = 0;

        if (vis.starred()) { // Find which column. Row is set to the memory row.
            var memoryRowIndex = vis.memoryRowIndex();
            for (var i = 0; i < id; i++) {
                if (!vises[i] || !vises[i].vis.starred() || vises[i].vis.memoryRowIndex() !== memoryRowIndex) {
                    index--;
                };
            }
            y = height - TOOLBAR_HEIGHT - VIS_PADDING / 2 - getMemoryHeight(memoryRowIndex, memoryActiveRowIndex) + ivs.INFO_PANEL_HEIGHT;
        } else { // Find which column
            for (var i = 0; i < id; i++) {
                if (!vises[i] || vises[i].vis.starred() || vises[i].vis.floating()) {
                    index--;
                }
            }
        }

        var x = getCollapsedVisWidth() * index + VIS_PADDING;
        if (vis.starred()) {
            x += MEMORY_HEAD_WIDTH;
        }

        return [x, y];
    };

    function getCollapsedVisWidth() {
        return Math.round(visWidth * ivs.THUMBNAIL_RATIO) + VIS_PADDING;
    }

    function addHelp() {
        d3.select("body").on("keydown", function() {
            if (d3.event.keyCode === 72 && document.activeElement == document.body) {
                container.call(ivs.widgets.help());
            }
        });
    }

    /**
     * Updates collapsed status.
     */
    module.updateNumCollapsedVises = function(offset) {
        numCollpasedVises += offset;
    };

    /**
     * Returns the centre position for active vis.
     */
    module.getCentrePosition = function() {
        var x = getXPosOfCentreVis(activeVises.length - (activeVises.length < numMaxVises ? 0 : 1), activeVises.length + (activeVises.length < numMaxVises ? 1 : 0));
        var y = thumbnailHeight + ivs.INFO_PANEL_HEIGHT * 2 + VIS_PADDING;

        return [x, y];
    };

    function getXPosOfCentreVis(idx, total) {
        var inUseWidth = total * visWidth + (total - 1) * GAP_BETWEEN_CENTRE_VISES;
        var offsetToTheEdge = (width - inUseWidth) / 2; // Vises are in the centre
        var offsetFromLeftSideOfVisToTheRightEdge = offsetToTheEdge + visWidth;
        offsetFromLeftSideOfVisToTheRightEdge += (total - idx - 1) * (visWidth + GAP_BETWEEN_CENTRE_VISES);

        return Math.round(width - offsetFromLeftSideOfVisToTheRightEdge);
    }

    function computeVisWidth() {
        visHeight = Math.round((height - TOOLBAR_HEIGHT - MEMORY_BAR_HEIGHT - ivs.INFO_PANEL_HEIGHT * 2 - VIS_PADDING * 2) / (1 + ivs.THUMBNAIL_RATIO)); // 20% for collapsed vis
        visWidth = Math.round((width - (numMaxVises - 1) * GAP_BETWEEN_CENTRE_VISES - VIS_PADDING * 2) / numMaxVises);
        thumbnailHeight = Math.floor(visHeight * ivs.THUMBNAIL_RATIO);
        thumbnailHeightInlcudingButtons = thumbnailHeight + ivs.INFO_PANEL_HEIGHT;
    }

    /**
     * Sets/Gets the width of the visualisation. 
     */
    module.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        computeVisWidth();
        return this;
    };
    
    /**
     * Sets/Gets the height of the visualisation. 
     */
    module.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        computeVisWidth();
        return this;
    };

    /**
     * Sets/Gets the maximum number of vises at the same time of the visualisation. 
     */
    module.numMaxVises = function(value) {
        if (!arguments.length) return numMaxVises;
        numMaxVises = value;
        computeVisWidth();
        return this;
    };

    // Caller can listen to the dispatched events by using "on".
    d3.rebind(module, dispatch, "on");
    
    return module;
};