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
	var allRecords, // All original records
		allKnownCellDict = {},
		interestedCells,
		interestedCellDict = {},
		interestedConns,
		interestedAreaDict = {}, 
		cellMarkerDict = {},
		unknownConnDict; // A dictionary of unknown, interested cells. Value is an array of known cells connecting to it.

	var map,
		latScale, lonScale;

	var phoneAdded = 0;

	var numCellsFound = 0,
		inferConnDict = {}, // To control duplicate coordinates when cells have the same connectivity. Key is a unique combination of connected cells.
		timeFormat = d3.time.format("%d/%m/%Y %H:%M:%S"),
		timeThreshold = 1000 * 100; // Smaller than this value means two cells are connected

	var dispatch = d3.dispatch("dataLoaded");

	readParam();
	// loadData();
	loadPrecomputedData();
	intializeMap();

	dispatch.on("dataLoaded", function() {
		drawKnownData();
		buildAreaFilter();

		// findAllUnknownCells();
		while (findAllUnknownCells()) {
		}

		console.log("Done");

		// Export
		$.post("saveFile.php", { fileName: "updateInterestedCells.csv", data: d3.csv.format(interestedCells) });
	});

	function loadData() {
		// Load interested cells
		d3.csv("../data/mobiles/interestedCells.csv", function(rows) {
			interestedCells = rows;

			interestedCells.forEach(function(d) {
				// Format cells
				d.lat = +d.lat;
				d.lon = +d.lon;

				// Split by area
				var key = d.areaId;
				if (!interestedAreaDict[key]) {
					interestedAreaDict[key] = [];
				}
				interestedAreaDict[key].push(d);

				// Put to dictionary for fast reference
				interestedCellDict[d.cellId] = d;
			});

			console.log("Interested cells = " + interestedCells.length);
			var numKnownCells = getNumKnownCells();
			console.log("Intially found = " + numKnownCells + ". Rate = " + (numKnownCells / interestedCells.length * 100).toFixed(1) + "%");

			// Load interested connections
			d3.csv("../data/mobiles/mobileAllConnections.csv", function(rows) {
				interestedConns = rows;

				// Load all records
				d3.csv("../data/mobiles/allConnectionsIncludingDuplicates.csv", function(rows) {
					console.log("All record loaded, total = " + rows.length);
					allRecords = rows;

					var cell2Phone = {};

					allRecords.forEach(function(d) {
						// Format time
						d.time = timeFormat.parse(d.time);

						// To show which phones on what cell
						if (!cell2Phone[d.cellId]) {
							cell2Phone[d.cellId] = [];
						}
						if (cell2Phone[d.cellId].indexOf(d.phone) === -1) {
							cell2Phone[d.cellId].push(d.phone);
						}
					});

					// Update phone info
					interestedCells.forEach(function(d) {
						cell2Phone[d.cellId].sort(function(a, b) { return d3.ascending(a, b)});
						d.phones = cell2Phone[d.cellId].join("-");
					});

					// Load all known cells
					d3.csv("../data/mobiles/allKnownCells.csv", function(rows) {
						console.log("All known cells including not interested loaded, total = " + rows.length);
						
						rows.forEach(function(d) {
							// Format cells
							d.lat = +d.lat;
							d.lon = +d.lon;
							
							// Put to dictionary for fast reference
							allKnownCellDict[d.cellId] = d;
						});

						dispatch.dataLoaded();
					});
				});
			});
		});
	}

	function loadPrecomputedData() {
		d3.csv("../data/mobiles/updateInterestedCells.csv", function(rows) {
			interestedCells = rows;
			interestedCells.forEach(function(d) {
				// Format cells
				d.lat = +d.lat;
				d.lon = +d.lon;

				// Split by area
				var key = d.areaId;
				if (!interestedAreaDict[key]) {
					interestedAreaDict[key] = [];
				}
				interestedAreaDict[key].push(d);
			});

			drawData();
			buildAreaFilter();
		});
	}

	function getNumKnownCells() {
		return interestedCells.filter(function(d) { return d.lat !== 0; }).length;
	}

	function drawKnownData() {
		interestedCells.forEach(function(d) {
			if (d.lat !== 0) {
				addMarker(d, false);
			}
		});
	}

	function drawData() {
		interestedCells.forEach(function(d) {
			if (d.lat !== 0) {
				addMarker(d, d.isNew === "true");
			}
		});	
	}

	function buildAreaFilter() {
		// Populate data to the combo-box
		for (var areaId in interestedAreaDict) {
			$("<option>" + areaId + "</option>").appendTo($("#areaFilter"));
		}

		// Add event listener
		$("#areaFilter").change(function() {
			filterCellsByAreaId($(this).val());
		});
	}

	function filterCellsByAreaId(filteredAreaId) {
		if (filteredAreaId === "ALL") { // Show all cells
			for (var cellId in cellMarkerDict) {
				cellMarkerDict[cellId].setVisible(true);
			}
			resetZoom();
			return;
		}

		// Show/hide cells
		for (var cellId in cellMarkerDict) {
			cellMarkerDict[cellId].setVisible(filteredAreaId === getArea(cellId));
		}

		var filteredKnownCells = 0;
		interestedAreaDict[filteredAreaId].forEach(function(d) {
			filteredKnownCells += (d.lat !== 0 ? 1 : 0);
		});
		
		if (filteredKnownCells > 0) {
			zoomToArea(filteredAreaId);
		} else {
			resetZoom();
		}
	}

	function findAllUnknownCells() {
		numCellsFound = 0;
		inferConnDict = {};

		buildUnknownConnections();

		for (var cellId in interestedCellDict) {
			if (interestedCellDict[cellId].lat === 0) {
				findCoord(cellId);
			}
		}

		var numKnownCells = getNumKnownCells();
		console.log("Found more = " + numCellsFound + ". Total = " + numKnownCells + ". New rate = " + (numKnownCells / interestedCells.length * 100).toFixed(1) + "%");

		return numCellsFound;
	}

	// /**
	//  * [OLD] Area-wise
	//  */
	// function findUnknownCells(areaId) {
	// 	// Get only connections between cells within the given area
	// 	var knownCellIds = [];
	// 	var cellIds = interestedAreaDict[areaId].map(function(d) {
	// 		if (d.lat !== 0) { knownCellIds.push(d.cellId); }
	// 		return d.cellId;
	// 	});
	//  	var filteredConns = interestedConns.filter(function(d) {
	// 		return cellIds.indexOf(d.source) !== -1 && cellIds.indexOf(d.target) !== -1;
	// 	});

	// 	// Build connections of unknown cells. Each entry contains list of KNOWN cells connecting to it.
	// 	var connDict = {};
	// 	filteredConns.forEach(function(d) {
	// 		if (knownCellIds.indexOf(d.source) === -1 && knownCellIds.indexOf(d.target) !== -1) {
	// 			if (!connDict[d.source]) {
	// 				connDict[d.source] = [];
	// 			}
	// 			connDict[d.source].push(d.target);
	// 		}

	// 		if (knownCellIds.indexOf(d.target) === -1 && knownCellIds.indexOf(d.source) !== -1) {
	// 			if (!connDict[d.target]) {
	// 				connDict[d.target] = [];
	// 			}
	// 			connDict[d.target].push(d.source);
	// 		}
	// 	});

	// 	// Infer unknown cells = average of known, connected cells to it
	// 	for (var cellId in connDict) {
	// 		if (connDict[cellId].length === 1) { continue; }

	// 		var cell = interestedCellDict[cellId];
	// 		var sumLat = 0, sumLon = 0;
	// 		connDict[cellId].forEach(function(d) {
	// 			sumLat += interestedCellDict[d].lat;
	// 			sumLon += interestedCellDict[d].lon;
	// 		});

	// 		var nlat = 0, nlon = 0;
	// 		if (addToDict(connDict[cellId])) {
	// 			nlat = getNoise();
	// 			nlon = getNoise();
	// 		}

	// 		cell.lat = sumLat / connDict[cellId].length + nlat;
	// 		cell.lon = sumLon / connDict[cellId].length + nlon;

	// 		// Draw new cell
	// 		addMarker(cell, true);

	// 		numCellsFound++;
	// 	}
	// }

	/**
	 * Builds a dictionary of unknown, interested cells. Value is an array of known cells connecting to it.
	 */
	function buildUnknownConnections() {
		// Consider current cell and next cell
		// Quick skip if they are the same cell OR they belong to different phones.
		// If they are both known or unknown. Skip it.
		// If not, the unknown is called the host, the known is called the target. 
		// We add the target as a connected cell to the host if 
		// 1. the host is interested 
		// 2. travel time between them is less than a threshold.
		// 3. the target was not added
		unknownConnDict = {};

		for (var i = 0; i < allRecords.length - 1; i++) {
			var currentRow = allRecords[i];
			var nextRow = allRecords[i + 1];

			// Quick skip
			if (currentRow.cellId === nextRow.cellId) { continue; }
			if (currentRow.phone !== nextRow.phone) { continue; }

			// Skip if both known or unknown
			var currentKnown = allKnownCellDict[currentRow.cellId];
			var nextKnown = allKnownCellDict[nextRow.cellId];
			if ((currentKnown && nextKnown) || (!currentKnown && !nextKnown)) { continue; }

			// Unknown is host, known is target
			var host = currentRow.cellId, target = nextRow.cellId;
			if (currentKnown) {
				host = nextRow.cellId;
				target = currentRow.cellId;
			}

			if (!interestedCellDict[host]) { continue; }
			if (nextRow.time - currentRow.time > timeThreshold) { continue; }

			if (!unknownConnDict[host]) {
				unknownConnDict[host] = [];
			}
			if (unknownConnDict[host].indexOf(target) === -1) {
				unknownConnDict[host].push(target);
			}
		}
	}

	function findCoord(cellId) {
		if (!unknownConnDict[cellId] || unknownConnDict[cellId].length === 1) { return; }

		var cell = interestedCellDict[cellId];
		var sumLat = 0, sumLon = 0;
		unknownConnDict[cellId].forEach(function(d) {
			sumLat += allKnownCellDict[d].lat;
			sumLon += allKnownCellDict[d].lon;
		});

		var nlat = 0, nlon = 0;
		if (addToDict(unknownConnDict[cellId])) {
			nlat = getNoise();
			nlon = getNoise();
		}

		// Update new coord
		cell.lat = sumLat / unknownConnDict[cellId].length + nlat;
		cell.lon = sumLon / unknownConnDict[cellId].length + nlon;
		cell.isNew = true;

		// One new found, update the dictionary for next iteration
		allKnownCellDict[cellId] = cell;

		// Draw new cell
		addMarker(cell, true);

		numCellsFound++;
	}

	function addToDict(cells) {
		cells.sort();
		var key = cells.join("-");
		if (!inferConnDict[key]) { 
			inferConnDict[key] = 0;
		}
		inferConnDict[key]++;

		return inferConnDict[key] > 1;
	}

	function getNoise() {
		return Math.random() * 0.001;
	}

	function zoomToArea(areaId) {
		var bounds = new google.maps.LatLngBounds();
		interestedAreaDict[areaId].forEach(function(d) {
			if (d.lat !== 0) {
				bounds.extend(cellMarkerDict[d.cellId].getPosition());
			}
		});
		map.fitBounds(bounds);
	}

	function resetZoom() {
		map.setCenter(new google.maps.LatLng(30, 0));
		map.setZoom(3);
	}

	function addMarker(d, isNew) {
		var iconUrl = "";
		if (phoneAdded) {
			iconUrl = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=" + d.phones + "|" + (isNew ? "0000ff" : "FF0000") + "|ffffff";
		} else {
			iconUrl = isNew ? "http://maps.gstatic.com/mapfiles/markers2/boost-marker-mapview.png" : "http://maps.gstatic.com/mapfiles/markers2/marker.png";
		}

		cellMarkerDict[d.cellId] = new google.maps.Marker({
	      	position: new google.maps.LatLng(d.lat, d.lon),
	      	map: map,
	      	icon: iconUrl,
	      	title: d.cellId
	  	});
	}

	function getArea(cell) {
		return cell.split(".")[0];
	}

	function readParam() {
		$.queryString = (function(a) {
		    if (a == "") return {};
		    var b = {};
		    for (var i = 0; i < a.length; ++i)
		    {
		        var p=a[i].split('=');
		        if (p.length != 2) continue;
		        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
		    }
		    return b;
		})(window.location.search.substr(1).split('&'));

		phoneAdded = +$.queryString["phoneAdded"];
	}

	function intializeMap() {
		var mapOptions = {
		    zoom: 3,
		    center: new google.maps.LatLng(30, 0)
		};
		map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	}
});