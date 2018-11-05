$(function() {
	// Create SVG
	var w = $(window).width();
	var h = $(window).height();
	var svg = d3.select("body").append("svg")
		.attr("width", w)
		.attr("height", h);

	// Singleton canvas
	var numMaxVises = $.queryString["numMaxVises"];
	ivs.app = ivs.apps.canvas().width(w).height(h).numMaxVises(numMaxVises ? numMaxVises : 2);
	ivs.app.selectionManager = ivs.data.selectionManager();
	ivs.app.selectionListenerList = [];
    svg.call(ivs.app);

    ivs.init();

    // socket.io
    var socket = io.connect("http://localhost:1984/");
    socket.on('provenanceRequest', function (d) {
        if (d.client === "ukvac2") {
        	alert("Receive a request to show interactive provenance of finding id = " + d.id);
        }
	});
});