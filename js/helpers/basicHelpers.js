ivs.helpers.basic = {};

/**
 * Returns a deep-copy of the object.
 */
ivs.helpers.basic.deepCopy = function(object) {
	return $.extend(true, {}, object);
};

/**
 * Checks whether a DOM contains a given point.
 */
Element.prototype.containsPoint = function(pos) {
	var rect = this.getBoundingClientRect();
    return pos.x >= rect.left && pos.x <= rect.right && pos.y >= rect.top && pos.y <= rect.bottom;
}

$.fn.highlight = function(what, spanClass) {
	// TODO: search in markup (search highlighted text)	
    return this.each(function() {
        var rawContent = this.textContent;
    	if (what) {
	        var pattern = new RegExp(what, 'gi'),
	            formattedContent = rawContent.replace(pattern, function(match) {
	            	return '<span ' + ( spanClass ? 'class="' + spanClass + '"' : '' ) + '>' + match + '</span>';
	            });
	        this.innerHTML = formattedContent;
       	} else {
       	    this.innerHTML = rawContent;
       	}
    });
};

/**
 * Returns the url parameter object. Ex: $.queryString["param1"].
 */
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

/**
 * Decodes the string.
 */
String.prototype.htmlDecode = function() {
	return $("<div/>").html(this).text();
}