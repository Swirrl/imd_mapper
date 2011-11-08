(function() {

  // the constructor.
  var SidebarManager = function() {
  };

  // public api.
  SidebarManager.prototype = {
    populate: function(lsoaNotation, data, scoreDomain) {
      var lsoaTemplate = $($("#templates .lsoa_template")[0]);
      var labelLink = lsoaTemplate.find("h3 a");
      labelLink.attr('href', 'http://opendatacommunities.org/id/geography/lsoa/' + lsoaNotation);
      labelLink.html(lsoaNotation + " - " + data.label );

      var currentScoreDomainConfig = window.swirrl.scoreDomainConfig[scoreDomain];

      lsoaTemplate.find("a.observation").attr('href', 'http://opendatacommunities.org/id/IMD/2010/' + scoreDomain + '/LSOA/' + lsoaNotation );
      lsoaTemplate.find(".score_value").html(data.score);
      lsoaTemplate.find(".score_name").html(currentScoreDomainConfig['human-name']);
      lsoaTemplate.find(".max_score").html(currentScoreDomainConfig['max']);
      lsoaTemplate.find(".min_score").html(currentScoreDomainConfig['min']);
      $("#info #lsoa").html(lsoaTemplate.html());

      drawIMDDistribution(scoreDomain, data.score);
    },

    clear: function() {
      $("#info #lsoa").empty();
    }
  };

  // private functions

  var drawIMDDistribution = function(scoreDomain, score) {
    // make a bunch of functions in this closure, which we'll use.

    var normalise = function(width, height, minX, minY, maxX, maxY, vals) {
      var normalisedVals = [];
      for (var i=0; i<vals.length; i++ ){
        normalisedVals.push([
          normaliseVal(width, vals[i][0], minX, maxX),
          normaliseVal(height, vals[i][1], minY, maxY)*0.90 // adjust Y down by 5% to account for extra height of curve
        ])
      }
      return normalisedVals;
    };

    var normaliseVal = function(dimension, val, minVal, maxVal){
      return ((val-minVal)/(maxVal-minVal))*dimension;
    };

    var flipYs = function(height, vals) {
      var flippedVals = [];
      $.each(vals, function(i,val) {
        flippedVals.push( [val[0],height - val[1]]);
      });
      return flippedVals;
    };

    var drawCurve = function(paper, width, height, vals, colour) {
      var pathString = "";
      pathString += "M0," + height.toString() + " "; // start at the origin.

      var smoother = new PlotSmoother(3,1);
      smoother.setSane(true);
      pathString = smoother.smoothBezPath(vals);

      paper.path(pathString).attr({stroke: colour, 'stroke-width': 2, fill: colour, 'fill-opacity': 0.6});;
    };

    var drawCurrentValLine = function(paper, minX, minY, maxX, maxY, width, height, normalisedScore){
      pathString = "M" + normalisedScore.toString() + ",0";
      pathString += "L" + normalisedScore.toString() + "," + height;
      var path = paper.path(pathString).attr({stroke: "#333", 'stroke-width': 2, "stroke-dasharray": "."});
    };

    var currentScoreDomainConfig = window.swirrl.scoreDomainConfig[scoreDomain];

    var bgJqueryObj = $("#lsoa .distro .bg");
    var bgElement = bgJqueryObj[0];
    var bgWidth = parseInt((bgJqueryObj).width());
    var bgHeight = parseInt((bgJqueryObj).height());
    var bgPaper = Raphael(bgElement, bgWidth, bgHeight);

    // draw some axes
    var yAxis = "M14,0L14," + (bgHeight-13).toString();
    var xAxis = "M14," + (bgHeight-14).toString() + "L" + bgWidth.toString() + "," + (bgHeight-14).toString();
    bgPaper.path(yAxis).attr({ stroke:'#555'});
    bgPaper.path(xAxis).attr({ stroke:'#555'});
    var freqX = 5;
    var freqY = (bgHeight/2)-10;

    if (isIE) {
      // ie handles rotation differently, so we need to position it slightly differently.
      window.swirrl.log('IE!');
      freqX = -30;
      freqY = (bgHeight/2);
    }

    bgPaper.text(freqX, freqY, "Frequency").attr({fill:"#555", "font-size":"9px", "text-anchor": "middle", "font-weight": "lighter", rotation:270});
    bgPaper.text(bgWidth-5, bgHeight-5, "Level of deprivation").attr({fill:"#555", "font-size":"9px", "font-weight": "lighter", "text-anchor": "end"});

    // now draw the graph
    var graphJqueryObj = $("#lsoa .distro .graph");
    var graphElement = graphJqueryObj[0];
    var graphWidth = parseInt((graphJqueryObj).width());
    var graphHeight = parseInt((graphJqueryObj).height());
    var graphPaper = Raphael(graphElement, graphWidth, graphHeight);

    var vals = currentScoreDomainConfig.distribution;
    var xVals = $.map(vals, function(val){ return val[0]; });
    var yVals = $.map(vals, function(val){ return val[1]; });

    var maxX = Array.max(xVals);
    var maxY = Array.max(yVals);
    var minX = Array.min(xVals);
    var minY = Array.min(yVals);

    // we now want to normalize the values so that they can be plotted in our paper.
    // and flip the Y-vals, as Raphael plots from bottom, up
    var normalisedVals = normalise(graphWidth, graphHeight, minX, minY, maxX, maxY, vals);
    var flippedAndNormalisedVals = flipYs(graphHeight,normalisedVals);
    var normalisedScore = normaliseVal(graphWidth, score, minX, maxX);
    var colour = window.swirrl.viewHelpers.getRgbStringForScore(score, currentScoreDomainConfig['min'], currentScoreDomainConfig['max']);

    // draw the curve
    drawCurve(graphPaper, graphWidth, graphHeight, flippedAndNormalisedVals, colour);

    // finally, plot our current value as a vertical line.
    drawCurrentValLine(graphPaper, minX, minY, maxX, maxY, graphWidth, graphHeight, normalisedScore)
  };

  window.swirrl.SidebarManager = SidebarManager;
})();