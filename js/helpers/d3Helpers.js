ivs.helpers.d3 = {};

/**
 * Moves the selection to front. Useful when dragging and dropping. 
 */
d3.selection.prototype.moveToFront = function() { 
    return this.each(function() { 
        this.parentNode.appendChild(this); 
    }); 
};

/**
 * Returns the string of points representing a star.
 * Source: http://dillieodigital.wordpress.com/2013/01/16/quick-tip-how-to-draw-a-star-with-svg-and-javascript/
 */
ivs.helpers.d3.calculateStarPoints = function(x, y, arms, outerRadius, innerRadius) {
   var results = "";
   var angle = Math.PI / arms;
 
   for (var i = 0; i < 2 * arms; i++) {
      // Use outer or inner radius depending on what iteration we are in.
      var r = (i & 1) == 0 ? outerRadius : innerRadius;
      
      var currX = x + Math.cos(i * angle - Math.PI / 2) * r;
      var currY = y + Math.sin(i * angle - Math.PI / 2) * r;
 
      // Our first time we simply append the coordinates, subsequet times
      // we append a ", " to distinguish each coordinate pair.
      if (i == 0) {
         results = currX + "," + currY;
      } else {
         results += ", " + currX + "," + currY;
      }
   }
 
   return results;
}

/**
 * Checks if two given rectangles intersects each other.
 */
ivs.helpers.d3.isIntersected = function(rect1, rect2) {
  return rect1.right > rect2.left && rect2.right > rect1.left && rect1.bottom > rect2.top && rect2.bottom > rect1.top;
}