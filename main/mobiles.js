$(function() {
	var knownAreas = [
		{ "cellId": "5119.40332", "lat": "42.363301", "lon": "-71.0918" },
		{ "cellId": "5119.40342", "lat": "42.3587597", "lon": "-71.1011627" },
		{ "cellId": "5119.40793", "lat": "42.359737", "lon": "-71.093549" },
		{ "cellId": "5119.40801", "lat": "42.353878", "lon": "-71.104926" },
		{ "cellId": "5119.40802", "lat": "42.35435", "lon": "-71.103467" },
		{ "cellId": "5119.40811", "lat": "42.360716", "lon": "-71.087508" },
		{ "cellId": "5123.40763", "lat": "42.3587597", "lon": "-71.1011627" },
		{ "cellId": "5131.43861", "lat": "42.360488", "lon": "-71.084332" },
		{ "cellId": "24127.02353", "lat": "42.358944", "lon": "-71.092417" },
		{ "cellId": "24127.02833", "lat": "42.3590989", "lon": "-71.0945356" }
	];
	var knownCellIds;


	var latScale, lonScale;
	var allConns;

	var dispatch = d3.dispatch("dataLoaded", "dataFormatted");

	// formatData();
	loadData();

	dispatch.on("dataFormatted", function(data) {
		// drawData(data);
		// buildTable(data);
	}).on("dataLoaded", function(data) {
		allConns = data;
		setupScales();
		// drawKnownData();
		filterData();
	});

	function setupScales() {
		var svg = d3.select("svg");
		var w = $("svg").width();
		var h = $("svg").height();

		latScale = d3.scale.linear()
			.domain([42.35, 42.39])
			.range([h, 0]);
		lonScale = d3.scale.linear()
			.domain([-71.12, -71.05])
			.range([0, w]);
	}

	function drawKnownData() {
		var svg = d3.select("svg");
		var g = svg.selectAll("g.knownAreas").data([0]);
		g.enter().append("g").attr("class", "knownAreas");
		var gEnter = g.selectAll(".node").data(knownAreas).enter();
		gEnter.append("circle")
			.attr("class", "node")
		    .attr("r", 3)
		    .attr("cx", function(d) { return lonScale(d.lon); })
		    .attr("cy", function(d) { return latScale(d.lat); })
		    .style("fill", "yellow");
		gEnter.append("title")
		    .text(function(d) { return d.cellId; });
	}

	function loadData() {
		d3.csv("../data/mobiles/mobileAllConnections.csv", function(rows) {
			if (!rows.length) { return; }
			console.log("Total connections = " + rows.length);

			dispatch.dataLoaded(rows);
		});
	}

	function filterData() {
		knownCellIds = knownAreas.map(function(d) { return d.cellId; });

		console.log("Level 1: Use neighbours of known areas")
		// Level 1: Use neighbours of known areas
		var activeConns = [],
			activeNodes = [];
		allConns.forEach(function(d) {
			if (knownCellIds.indexOf(d.source) !== -1 || knownCellIds.indexOf(d.target) !== -1) {
				activeConns.push(d);

				if (activeNodes.indexOf(d.source) === -1) {
					activeNodes.push(d.source);
				}
				if (activeNodes.indexOf(d.target) === -1) {
					activeNodes.push(d.target);
				}
			}
		});

		console.log(activeNodes.length + " nodes" + "   " + activeConns.length + " connections");

		// Prepare data for D3's force layout
		var data = {};
		// - Nodes
		data.nodes = activeNodes.map(function(d) {
			var node = { "name": d };

			// Fixed known areas
			var index = knownCellIds.indexOf(d);
			if (index !== -1) {
				var cell = knownAreas[index];
				node.fixed = true;
				node.x = lonScale(cell.lon);
				node.y = latScale(cell.lat);
			}

			return node;
		});

		// - Links
		var activeDict = {};
		data.links = activeConns.map(function(d) {
			var key = +d.source < +d.target ? d.source + "-" + d.target : d.target + "-" + d.source;
			activeDict[key] = 1;

			return { 
				"source": activeNodes.indexOf(d.source),
				"target": activeNodes.indexOf(d.target),
				"value": 1
			};
		});

		// -- Add 0-value connections for all non-existed connections so that non-connected areas are further than connected ones
		var connDict = {};
		for (var i = 0; i < activeNodes.length; i++) {
			for (var j = i + 1; j < activeNodes.length; j++) {
				var key = +activeNodes[i] < +activeNodes[j] ? activeNodes[i] + "-" + activeNodes[j] : activeNodes[j] + "-" + activeNodes[i];
				if (!activeDict[key]) {
					activeDict[key] = 1;
					data.links.push({ 
						"source": i,
						"target": j,
						"value": 0
					});
				}
			}
		}

		drawNetwork(data);
	}

 	/**
	 * Draws the network with the given data.
	 */
	function drawNetwork(data) {
		console.log("Drawing...");

		var svg = d3.select("svg");
		var w = $("svg").width();
		var h = $("svg").height();

		var nonConnectedDistance = 400;
		var minConnectedDistance = 20;

		var dScale = function(v) {
        	return v ? minConnectedDistance : nonConnectedDistance;
        };

		var force = d3.layout.force()
		    .charge(-120)
		    .linkDistance(function(link, index) { return dScale(data.links[index].value); })
		    .size([w, h]);

		force
		    .nodes(data.nodes)
		    .links(data.links)
		    .start();

		// Links between nodes
		var nonZeroLinks = data.links.filter(function(d) {
			return d.value > 0;
		});
		var link = svg.selectAll(".link")
		    .data(nonZeroLinks)
		    .enter().append("line")
				.attr("class", "link")
		      	.style("opacity", 0.2);

		// Nodes
		var node = svg.selectAll(".node")
			.data(data.nodes)
		    .enter().append("circle")
		        .attr("class", "node")
		        .attr("r", function(d) { return (d.fixed ? 5 : 3); })
		        .style("fill", function(d) { return (d.fixed ? "yellow" : "steelblue");})
		        .call(force.drag);

		node.append("title")
		    .text(function(d) { return d.name; });

		force.on("tick", function() {
		    link.attr("x1", function(d) { return d.source.x; })
		        .attr("y1", function(d) { return d.source.y; })
		        .attr("x2", function(d) { return d.target.x; })
		        .attr("y2", function(d) { return d.target.y; });

		    node.attr("cx", function(d) { return d.x; })
		        .attr("cy", function(d) { return d.y; });

		    // Bounding box?
		    // node.attr("cx", function(d) { return d.x = Math.max(r, Math.min(w - r, d.x)); })
    		// 	.attr("cy", function(d) { return d.y = d.fixed ? d.y : Math.max(r, Math.min(h - r, d.y)); });

		    // Exclude the river!
	        var r = 3;
	        node.attr("cx", function(d) { return d.x = Math.max(r, Math.min(w - r, d.x)); })
    			.attr("cy", function(d) { return d.y = d.fixed ? d.y : Math.max(r, Math.min(h * (0.8 + Math.random() / 10) - r, d.y)); });
		}).on("end", function() {
			// drawVoronoi(node);

			var coords = [];
			svg.selectAll(".node").each(function(d) {
				coords.push({ "cellId": d.name, "lat": latScale.invert(d.y), "lon": lonScale.invert(d.x) });
			});
        	$.post("saveFile.php", { fileName: "distance1", data: d3.csv.format(coords) });
		});
	}

	// /**
	//  * Run once to parse data, export to table and save to smaller file.
	//  */
	// function loadData() {
	// 	var connDict = {}; // Dictionary of "startCellId-endCellId"

	// 	d3.csv("../data/mobiles/mobileCellIds.csv", function(rows) {
	// 		if (!rows.length) { return; }

	// 		// Unique areaIDs
	// 		var cells = [rows[0].cellId];
	// 		console.log("Total rows in dataset = " + rows.length);

	// 		// Traverse through the entire file, starting from the 2nd one.
	// 		// If the current row and the previous one belong to the same phone, we have one connection.
	// 		for (var i = 1; i < rows.length; i++) {
	// 			var currentRow = rows[i];
	// 			var prevRow = rows[i - 1];

	// 			// Different phone, restart because it doesn't have any connection with the previous row.
	// 			if (currentRow.phone !== prevRow.phone) { continue; }

	// 			var key = +prevRow.cellId < +currentRow.cellId ? prevRow.cellId + "-" + currentRow.cellId : currentRow.cellId + "-" + prevRow.cellId;
	// 			if (!connDict[key]) {
	// 				connDict[key] = 1;
	// 			}

	// 			// Add cell if not exist
	// 			if (cells.indexOf(currentRow.cellId) === -1) {
	// 				cells.push(currentRow.cellId);
	// 			}
	// 		}

	// 		var fullData = d3.entries(connDict).map(function(d) { return { "source": d.key.split("-")[0], "target": d.key.split("-")[1]}; });
	// 		dispatch.dataLoaded(fullData);
	// 		console.log("Total edges = " + fullData.length);

	// 		var table = $("table");
	// 		fullData.forEach(function(d) {
	// 			var row = $("<tr></tr>").appendTo(table);
	// 			$("<td>" + d.source + "</td>").appendTo(row);
	// 			$("<td>" + d.target + "</td>").appendTo(row);
	// 		});
	// 	});
	// }

	// /**
	//  * Formats data to conform to D3 force layout.
	//  */
	// function formatData() {
	// 	var connDict = {}; // Dictionary of "startCellId-endCellId", store number of connections and their total time (in ms)
	// 	var data = {}; // Store formatted data
	// 	var format = d3.time.format("%d/%m/%Y %H:%M");

	// 	d3.csv("../data/mobileCellIds.csv", function(rows) {
	// 		if (!rows.length) { return; }

	// 		// Format fields
	// 		rows.forEach(function(d) {
	// 			d.time = format.parse(d.time);
	// 		});

	// 		// Unique areaIDs
	// 		var areas = [rows[0].areaId];

	// 		// Traverse through the entire file, starting from the 2nd one.
	// 		// If the current row and the previous one belong to the same phone, we have one connection, save the diff time as well.
	// 		for (var i = 1; i < rows.length; i++) {
	// 			var currentRow = rows[i];
	// 			var prevRow = rows[i - 1];

	// 			// Different phone, restart because it doesn't have any connection with the previous row.
	// 			if (currentRow.phone !== prevRow.phone) { continue; }

	// 			var key = +prevRow.areaId < +currentRow.areaId ? prevRow.areaId + "-" + currentRow.areaId : currentRow.areaId + "-" + prevRow.areaId;
	// 			if (!connDict[key]) {
	// 				connDict[key] = { "numConnections": 0, "totalTime": 0 };
	// 			}
	// 			connDict[key].numConnections++;
	// 			connDict[key].totalTime += currentRow.time - prevRow.time;

	// 			// Add area if not exist
	// 			if (areas.indexOf(currentRow.areaId) === -1) {
	// 				areas.push(currentRow.areaId);
	// 			}
	// 		}

	// 		// Assign to formatted data
	// 		data.nodes = areas.map(function(d) {
	// 			return { "name": d };
	// 		});

	// 		// Add 0-value connections for all non-existed connections so that non-connected areas are further than connected ones
	// 		for (var i = 0; i < areas.length; i++) {
	// 			for (var j = i + 1; j < areas.length; j++) {
	// 				var key = +areas[i] < +areas[j] ? areas[i] + "-" + areas[j] : areas[j] + "-" + areas[i];
	// 				if (!connDict[key]) {
	// 					connDict[key] = { "numConnections": 0, "totalTime": 0 };
	// 				}
	// 			}
	// 		}

	// 		// Convert to array of connections following D3 format source-target-value
	// 		var connections = d3.entries(connDict);
	// 		data.links = connections.map(function(d) {
	// 			return { 
	// 				"source": areas.indexOf(d.key.split("-")[0]),
	// 				"target": areas.indexOf(d.key.split("-")[1]),
	// 				"value": d.value.numConnections, 
	// 				"totalTime": d.value.totalTime 
	// 			};
	// 		});

	// 		// Notify that data is formatted
	// 		dispatch.dataFormatted(data);
	// 	});
	// }


	// /**
	//  * Draws the network with the given data.
	//  */
	// function drawData(data) {
	// 	var svg = d3.select("svg");
	// 	var w = $("svg").width();
	// 	var h = $("svg").height();

	// 	var nonConnectedDistance = 400;
	// 	var minConnectedDistance = 30;
	// 	var maxConnectedDistance = 300;

	// 	// Link-distance scale
	// 	$.queryString = (function(a) {
	// 	    if (a == "") return {};
	// 	    var b = {};
	// 	    for (var i = 0; i < a.length; ++i)
	// 	    {
	// 	        var p=a[i].split('=');
	// 	        if (p.length != 2) continue;
	// 	        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
	// 	    }
	// 	    return b;
	// 	})(window.location.search.substr(1).split('&'));

	// 	var opt = +$.queryString["opt"];
	// 	var dScale;
	// 	if (opt === 1) {
	// 		// Option 1: Scale with the number of connections 0-max
	// 		dScale = d3.scale.linear()
	// 			.domain([0, d3.max(data.links, function(d) { return d.value; })])
	// 			.range([nonConnectedDistance, minConnectedDistance]);
	// 	} else if (opt === 2) {
	//         // Option 2: connected = 1, not connected = 0
	//         dScale = function(v) {
	//         	return v >= 1 ? minConnectedDistance : nonConnectedDistance;
	//         };
	// 	} else if (opt === 3) {
	//         // Option 3: Scale with average time: shorter in time -> closer in space
	// 		dScale = d3.scale.linear()
	// 			.domain([d3.min(data.links, function(d) { return d.totalTime / d.value; }), d3.max(data.links, function(d) { return d.totalTime / d.value; })])
	// 			.range([maxConnectedDistance, minConnectedDistance]);
	// 	}

	// 	var force = d3.layout.force()
	// 	    .charge(-0.1)
	// 	    .linkDistance(function(link, index) {
	// 	    	if (opt === 1 || opt === 2) {
	// 	    		// console.log(dScale(data.links[index].value));
 //                	return dScale(data.links[index].value);
	// 	    	} else if (opt === 3) {
	// 	    		// console.log(data.links[index].value ? dScale(data.links[index].totalTime / data.links[index].value) : nonConnectedDistance);
	// 	    		return data.links[index].value ? dScale(data.links[index].totalTime / data.links[index].value) : nonConnectedDistance;
	// 	    	}
 //            }).size([w, h]);

	// 	var count = 0;
	// 	var coords = [[300, 300], [600, 300], [300, 600], [600, 600]];

	// 	// data.nodes.forEach(function(d) {
	// 	// 	if (Math.random() < 0.2 && count < 4) {
	// 	// 		d.fixed = true;
	// 	// 		d.x = coords[count][0];
	// 	// 		d.y = coords[count][1];
	// 	// 		count++;
	// 	// 	}
	// 	// });

	// 	force
	// 	    .nodes(data.nodes)
	// 	    .links(data.links)
	// 	    .start();

	// 	// Links between nodes
	// 	var opaScale = d3.scale.log()
	// 		.domain([1, d3.max(data.links, function(d) { return d.value + 1; })])
	// 		.range([0, 1]);
	// 	var nonZeroLinks = data.links.filter(function(d) {
	// 		return d.value > 0;
	// 	});
	// 	var link = svg.selectAll(".link")
	// 	    .data(nonZeroLinks)
	// 	    .enter().append("line")
	// 			.attr("class", "link");
	// 	      	// .style("opacity", function(d) { console.log(opaScale(d.value + 1)); return opaScale(d.value + 1); });

	// 	// Nodes
	// 	var node = svg.selectAll(".node")
	// 		.data(data.nodes)
	// 	    .enter().append("circle")
	// 	        .attr("class", "node")
	// 	        .attr("r", 3)
	// 	        .style("fill", "steelblue").call(force.drag);

	// 	node.append("title")
	// 	    .text(function(d) { return d.name; });

	// 	force.on("tick", function() {
	// 	    link.attr("x1", function(d) { return d.source.x; })
	// 	        .attr("y1", function(d) { return d.source.y; })
	// 	        .attr("x2", function(d) { return d.target.x; })
	// 	        .attr("y2", function(d) { return d.target.y; });

	// 	    node.attr("cx", function(d) { return d.x; })
	// 	        .attr("cy", function(d) { return d.y; });
	// 	}).on("end", function() {
	// 		// drawVoronoi(node);
	// 	});
	// }

	/**
	 * Draws the voronoi diagram.
	 */
	function drawVoronoi(node) {
		// Input for the diagram
		var vertices = [];
		node.each(function(d) {
			vertices.push([d.x, d.y]);
		});

		var svg = d3.select("svg");
		var w = $("svg").width();
		var h = $("svg").height();

		var voronoi = d3.geom.voronoi()
			.clipExtent([[100, 100], [w-100, h-100]]);
		var path = svg.append("g").selectAll("path");
		// svg.selectAll("circle")
  //   		.data(vertices.slice(1))
  // 			.enter().append("circle")
  //   			.attr("transform", function(d) { return "translate(" + d + ")"; })
  //   			.style("fill", "white")
  //   			.attr("r", 1.5);

		redraw();

		function redraw() {
  			path = path
      			.data(voronoi(vertices), polygon);

  			path.exit().remove();

			path.enter().append("path")
				// .style("opacity", 0.75)
				.style("fill", "steelblue")
			    .attr("d", polygon);

  			path.order();

  			d3.select("svg").selectAll("line").each(function() {
  				d3.select("svg").node().appendChild(this);
  			});
  			d3.select("svg").selectAll("circle").each(function() {
  				d3.select("svg").node().appendChild(this);
  			});
		}

		function polygon(d) {
  			return "M" + d.join("L") + "Z";
		}
	}

	// /**
	//  * Builds a table of data.
	//  */
	// function buildTable(data) {
	// 	var table = $("table");
	// 	data.links.sort(function(a, b) {
	// 		return d3.descending(a.value, b.value);
	// 	});

	// 	data.links.forEach(function(d) {
	// 		if (!d.value) { return; }

	// 		var row = $("<tr></tr>").appendTo(table);
	// 		$("<td>" + d.source.name + "</td>").appendTo(row);
	// 		$("<td>" + d.target.name + "</td>").appendTo(row);
	// 		$("<td>" + d.value + "</td>").appendTo(row);
	// 		$("<td>" + (d.totalTime / 60000).toFixed(2) + "</td>").appendTo(row);
	// 		$("<td>" + (d.totalTime / 60000 / d.value).toFixed(2) + "</td>").appendTo(row);
	// 	});
	// }
});