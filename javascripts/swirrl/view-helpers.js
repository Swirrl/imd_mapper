(function() {
  window.swirrl.viewHelpers = {
    getRgbStringForScore: function(score, min, max) {
      var normalizedScore = ( score - min ) / (max - min); // this gives us a value between 0 and 1

      var minHue = 260, maxHue = 0;
      var hue = (normalizedScore * (maxHue - minHue) ) + minHue;
      var colourVal = 90;
      var colourSat = 90;

      var rgb = this.hsvToRgb(hue, colourSat, colourVal);
      var rgbColourStr = 'rgb(' + Math.floor(rgb[0]).toString() + ',' + Math.floor(rgb[1]).toString() + ',' + Math.floor(rgb[2]).toString() + ')';
      return rgbColourStr;
    },

    // slightly adapted version of http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    hsvToRgb: function(h, s, v){

      // normalize them all to between 0 and 1.
      h = h/360.0;
      s = s/100.0;
      v = v/100.0;

      var r, g, b;

      var i = Math.floor(h * 6);
      var f = h * 6 - i;
      var p = v * (1 - s);
      var q = v * (1 - f * s);
      var t = v * (1 - (1 - f) * s);

      switch(i % 6){
          case 0: r = v, g = t, b = p; break;
          case 1: r = q, g = v, b = p; break;
          case 2: r = p, g = v, b = t; break;
          case 3: r = p, g = q, b = v; break;
          case 4: r = t, g = p, b = v; break;
          case 5: r = v, g = p, b = q; break;
      }

      return [r * 255, g * 255, b * 255];
    },

    drawColourKey: function() {
      var self = this
        , noOfLines = 12.0
        , containerWidth = parseFloat($("#colour_key").css("width"))
        , lineWidth = containerWidth / noOfLines
        , lineHeight = parseFloat($("#colour_key").css("height"))
        , maxScore = 100
        , minScore = 0
        , scoreIncrement = (maxScore - minScore) / noOfLines
       , paper = Raphael("colour_key")

      function drawKeyLine(score, lineNo){
        var pathString = "M" + (lineNo * lineWidth + 0.5*lineWidth).toString() + ",0";
        pathString += "L" + (lineNo * lineWidth + 0.5*lineWidth ).toString() + "," + lineHeight;
        var colourStr = self.getRgbStringForScore(score, minScore, maxScore);
        paper.path(pathString).attr({stroke: colourStr, 'stroke-width':lineWidth});
      }

      var lineNo = 0;
      var score = minScore;
      drawKeyLine(score, lineNo);

      while (lineNo < noOfLines-1) {
        lineNo++;
        score += scoreIncrement;
        drawKeyLine(score, lineNo);
      }

      paper.text(5, 19, "Least\ndeprived").attr({fill:"#FFF", "font-size":"12px", "text-anchor": "start", "font-weight":"bold"});
      paper.text(containerWidth-5, 19, "Most\ndeprived").attr({fill:"#FFF", "font-size":"12px", "text-anchor": "end", "font-weight":"bold"});
    }

  };
})();