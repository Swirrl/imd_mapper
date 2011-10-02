(function() {

  // the constructor.
  var MapManager = function(googleMap, initialScoreDomain) {
    self = this;
    map = googleMap;
    scoreDomain = initialScoreDomain;

    $(this).bind('boundaryDataRetrieved', function() {
      boundaryDataRetrieved = true;
      refreshPolygonsWhenReady();
    });

    $(this).bind('lsoaDataRetrieved', function() {
      lsoaDataRetrieved = true;
      refreshPolygonsWhenReady();
    });

    // if there was an error getting any data, finish the request,
    // but don't remember the tiles ... so we can try again next time.
    $(this).bind('dataError', function() {
      // we only want to do this once - but getting boundaries or lsoa data (sparql) could raise this
      if (!errored) {
        errored = true;
        window.swirrl.log('data error!');
        prevTiles = []; // blank out the prevTiles
        $(this).trigger('finished'); // tell people we're done
      }
    });

  };

  // public api.
  MapManager.prototype = {
    refresh: function() {
      $(this).trigger('started');
      errored = false;

      // clear these variables for this refresh
      if (map.getZoom() > minZoom) {
        $(this).trigger('zoomOK');

        var tiles = getTiles();
        deleteOldTilesData(tiles);
        newTiles = getNewTiles(tiles);

        prevTiles = tiles; // remember this set of tiles for comparison next time.

        lsoaDataRetrieved = false;
        boundaryDataRetrieved = false;

        getBoundaryData(newTiles);
        getLsoaData(newTiles);

      } else {
        $(this).trigger('zoomTooWide');
        $(this).trigger('finished');
      }
    },

    changeScoreDomain: function(newScoreDomain) {
      scoreDomain = newScoreDomain;
      this.clearAllData();
      this.refresh();
    },

    clearAllData: function() {
      lsoaData = {};
      boundaryData = {};
      prevTiles = [];
      for (var k in polys) {
        polys[k].setMap(null);
      }
      polys = {};
      selectedPoly = null;
    }
  };

  // private variable
  var map
    , errored = false
    , prevTiles = []
    , scoreDomain
    , boundaryData = {} // map of tiles -> data
    , lsoaData = {} // map of tiles -> data
    , polys = {}
    , lsoaDataRetrieved = false
    , boundaryDataRetrieved = false
    , selectedPoly
    , minZoom = 12
    , self;

  // private functions

  var tileInArray = function(tile, tileArray) {
    var inArray = false;
    for(var i=0; i < tileArray.length; i++) {
      t = tileArray[i];
      if (t[0][0] == tile[0][0] && t[0][1] == tile[0][1] &&
        t[1][0] == tile[1][0] && t[1][1] == tile[1][1]) {
        inArray = true;
        break;
      }
    }
    return inArray;
  };

  var deleteOldTilesData = function(tiles) {
    for(var i = 0; i < prevTiles.length; i++) {
      var prevTile = prevTiles[i];
      if (!tileInArray(prevTile, tiles)) {
        window.swirrl.log('tile data not needed', prevTile);
        delete boundaryData[prevTile];
        delete lsoaData[prevTile];
      }
    }
  };

  var getNewTiles = function(tiles) {
    var newTiles = [];
    for(var i = 0; i < tiles.length; i++) {
      var tile = tiles[i];
      if (!tileInArray(tile, prevTiles)) {
        newTiles.push(tile);
      }
    }
    window.swirrl.log('no of new tiles', newTiles.length);
    window.swirrl.log('new tiles', newTiles);
    return newTiles;
  };

  var setBoundaryData = function(tile, lsoaNotation, data) {
    if (!boundaryData[tile]) {
      boundaryData[tile] = {};
    }
    boundaryData[tile][lsoaNotation] = data;
  };

  var setLsoaData = function(tile, lsoaNotation, data) {
     if (!lsoaData[tile]) {
      lsoaData[tile] = {};
    }
    lsoaData[tile][lsoaNotation] = data;
  };

  // work out the 0.1lat/long tiles that are convered by the current bounds
  var getTiles = function() {

    var divideLatByTen = function(latx10) {
      var lat = latx10.substring(0,2);
      if (latx10.length > 2) {
        lat += "." + latx10.substring(2);
      }
      return lat;
    };

    // for longs we have to account for the minus sign.
    var divideLongByTen = function(longx10){
      var lng = ""
      if (longx10[0] == "-") {
        // negative values
        if (longx10.length == 2){
          lng = "-0." + longx10[1];
        } else {
          lng = longx10.substring(0,2);
          if (longx10.length > 2) {
            lng += "." + longx10.substring(2);
          }
        }
      } else {
        // positive values
        if (longx10.length == 1){
          lng = "0." + longx10[0];
        } else {
          lng = longx10.substring(0,1);
          if (longx10.length > 1) {
            lng += "." + longx10.substring(1);
          }
        }
      }

      // edge case: convert -0.0 to 0.0
      if (lng == "-0.0") {
        lng = "0.0"
      }

      return lng;
    };

    var getTileBounds = function(lowerLatx10, lowerLongx10) {
      // make sure they're all strings.

      var upperLatx10 = (lowerLatx10 + 1).toString();
      var upperLongx10 = (lowerLongx10 + 1).toString();
      lowerLatx10 = lowerLatx10.toString();
      lowerLongx10 = lowerLongx10.toString();

      var lowerLat = divideLatByTen(lowerLatx10);
      var upperLat = divideLatByTen(upperLatx10);
      var lowerLong = divideLongByTen(lowerLongx10);
      var upperLong = divideLongByTen(upperLongx10);

      var tileBounds = [ [lowerLat, lowerLong], [upperLat, upperLong] ];
      window.swirrl.log(tileBounds);
      return tileBounds;
    };

    // work out the 0.1lat/long tiles that are convered by the current bounds
    var northEast = map.getBounds().getNorthEast();
    var southWest = map.getBounds().getSouthWest();

    // these are the outer bounds, rounded to 0.1 extremities.
    // we work with everything scaled up to 10 times the size to avoid floating point probs.
    var lowerLatx10 = Math.floor(southWest.lat() * 10);
    var upperLatx10 = Math.floor((northEast.lat()+0.1) * 10);
    var lowerLongx10 = Math.floor(southWest.lng() * 10);
    var upperLongx10 = Math.floor((northEast.lng()+0.1) * 10);

    var tiles = [];
    var lat = lowerLatx10;

    while (lat <= (upperLatx10-1)) {
      var lng = lowerLongx10;
      while (lng <= (upperLongx10 -1)) {
        tiles.push(getTileBounds(lat,lng));
        lng += 1;
      }
      lat += 1;
    }

    return tiles;
  };

  var getBoundaryData = function(tiles) {

    var noOfTiles = tiles.length;

    // nothing to do.
    if(noOfTiles == 0) {
      $(self).trigger('boundaryDataRetrieved');
    }

    var tilesRetrieved = 0;

    $.each(tiles, function(idx, tile) {
      var lat = tile[0][0].toString();
      var lng = tile[0][1].toString();
      $.ajax(
        'http://opendatacommunities.org/lsoa_tiles/lat' + lat + '/long' + lng + '.json',
        {
          success: function(data, textStatus, jqXHR) {
            for (var lsoaNotation in data) {
              setBoundaryData(tile, lsoaNotation, data[lsoaNotation]);
            }
            tilesRetrieved+=1;
            if (tilesRetrieved == tiles.length) {
              // we've got all the boundaries.
              $(self).trigger('boundaryDataRetrieved');
            }
          },
          error: function(jqXHR, textStatus, errorThrown) {
            window.swirrl.log("GET BOUNDARY TILE FAILURE: " + errorThrown);
            $(self).trigger('dataError');
          },
          timeout: 10000,
          dataType: 'json'
        }
      )
    });
  };

  var getLsoaData = function(tiles) {

    // define this inside this closure - it's not useful outside the scope of this func
    var buildSparql = function(tile) {

      var lowerLat = tile[0][0];
      var lowerLong = tile[0][1];
      var upperLat = tile[1][0];
      var upperLong = tile[1][1];

      var sparql = "PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#> " +
      "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
      "SELECT ?lsoa ?notation ?label ?lat ?long ?score" +
      " WHERE { " +
      "  GRAPH <http://opendatacommunities.org/id/graph/geography/lsoa> { " +
      "    ?lsoa a <http://opendatacommunities.org/def/geography#LSOA> . " +
      "    ?lsoa geo:lat ?lat . " +
      "    ?lsoa geo:long ?long . " +
      "    ?lsoa <http://www.w3.org/2004/02/skos/core#notation> ?notation . " +
      "    ?lsoa rdfs:label ?label . " +
      "  } " +
      "  GRAPH <http://opendatacommunities.org/id/graph/IMD/2010/" + scoreDomain + "> {  " +
      "    ?obs <http://purl.org/linked-data/sdmx/2009/dimension#refArea> ?lsoa . " +
      "    ?obs <http://opendatacommunities.org/def/IMD#" + scoreDomain + "> ?score . " +
      "  } " +
      "  FILTER ( ?lat >= " + lowerLat + " && " +
      "    ?lat < " + upperLat + " && " +
      "    ?long >= " + lowerLong + " && " +
      "    ?long < " + upperLong + " ) . " +
      "}";
      return sparql;

    };

    var noOfTiles = tiles.length;

    // nothing to do.
    if(noOfTiles == 0) {
      $(self).trigger('lsoaDataRetrieved');
    }

    var tilesRetrieved = 0;

    var page = 1;
    var pageSize = 1000;

    var callAjaxSparqlPaging = function(sparql, tile) {
      var queryUrl = "http://opendatacommunities.org/sparql.json?_page=" + page.toString() + "&_per_page=" + pageSize.toString() + "&query=" + encodeURIComponent(sparql);
      $.ajax(
        queryUrl,
        {
          success: function(data, textStatus, jqXHR) {
            var pageOfData = data.results.bindings;
            $.each(pageOfData, function(idx, el){
              var data = {
                uri: el.lsoa['value'],
                label: el.label['value'],
                lat: parseFloat(el.lat['value']),
                lng: parseFloat(el['long']['value']),
                score: parseFloat(el.score['value'])
              }
              var lsoaNotation = el.notation['value'];
              setLsoaData(tile, lsoaNotation, data);
            });

            if (pageOfData.length == pageSize) {
              // this page was full. There might be more.
              page += 1;
              callAjaxSparqlPaging(sparql);
            } else {
              // no more pages.
              tilesRetrieved+=1;
              if (tilesRetrieved == tiles.length) {
                // we've got all the lsoaData.
                $(self).trigger('lsoaDataRetrieved');
              }
            }
          },
          error: function(jqXHR, textStatus, errorThrown) {
            window.swirrl.log("SPARQL Fail: " + errorThrown + " " + textStatus);
            $(self).trigger('dataError');
          },
          dataType: 'json',
          timeout: 10000, // timeout after a short time.
        }
      );
    };

    // for each tile, get all the pages of data.
    $.each(tiles, function(i, tile){
      var sparql = buildSparql(tile);
      callAjaxSparqlPaging(sparql, tile);
    });
  };

  var refreshPolygonsWhenReady = function() {
    if (lsoaDataRetrieved && boundaryDataRetrieved) {
      refreshPolygons();
    }
  };

  var refreshPolygons = function() {
    var northEast = map.getBounds().getNorthEast();
    var southWest = map.getBounds().getSouthWest();

    // we want to add on 2km =~ 0.02deg, so we catch lsoas with centroids outside the map bounds by a little bit.
    var margin = 0.02;
    // go through all the lsoas and work out which the polygons we want to draw.
    for (var tile in lsoaData) {
      var tileLsoaData = lsoaData[tile];
      for (var lsoaNotation in tileLsoaData) {
        var data = tileLsoaData[lsoaNotation];
        if (data.lat > (southWest.lat() - margin) &&
          data.lat <= (northEast.lat() + margin) &&
          data.lng > (southWest.lng() - margin) &&
          data.lng <= (northEast.lng() + margin)
        ) {
          if (!(polys[data.lat + "," + data.lng])) {
            // we don't already have this polygon: draw it.
            drawPolygon(lsoaNotation, data, tile);
          }
        }
      }
    }

    // get rid of extra polygons on the map (ie in polys) that we don't need now, as they're outside the bounds.
    for (var k in polys) {
      var latLngArray = k.split(',');
      var lat = latLngArray[0], lng = latLngArray[1];
      // is the poly outside the bounds we're interested in.
      if (
        lat <= (southWest.lat() - margin) ||
        lat > (northEast.lat() + margin) ||
        lng <= (southWest.lng() - margin) ||
        lng > (northEast.lng() + margin)
      ) {

        // clear out the selected polygon variable if it's being removed
        if (selectedPoly == polys[k]) {
          selectedPoly = null;
        }

        // remove from the map and the polys object.
        polys[k].setMap(null);
        delete polys[k];
      }
    }

    $(self).trigger('finished');
  };

  var drawPolygon = function(lsoaNotation, data, tile) {
    var lsoaBoundaryData = boundaryData[tile][lsoaNotation]; // GeoJSON for this lsoa

    // for some reason we don't have boundary data for this lsoa
    if(!lsoaBoundaryData) {
      polys[lat + "," + lng] = new google.maps.Polygon(); // add an empty polygon
      return; // .. and quit
    }

    var dataCoords = lsoaBoundaryData.coordinates
      , polyType = lsoaBoundaryData['type']
      , lsoaScore = data.score
      , lat = data.lat
      , lng = data.lng
      , maxScore = window.swirrl.scoreDomainConfig[scoreDomain].max
      , minScore = window.swirrl.scoreDomainConfig[scoreDomain].min;

    // a little helper function to add to the
    function addToPaths(polyCoords) {
      $.each(polyCoords, function(i, coordinatesArray) {
        // push a google lat long array into our polyPaths.
        polyPaths.push(  $.map( coordinatesArray, function(lngLat){ return new google.maps.LatLng(lngLat[1], lngLat[0]); }));
      });
    };

    var polyPaths = [];
    if (polyType == "MultiPolygon") {
      $.each( dataCoords, function(i, polyCoords) {
        addToPaths(polyCoords);
      });
    } else {
      addToPaths(dataCoords);
    }

    var poly = new google.maps.Polygon({
      paths: polyPaths,
      strokeColor: '#555',
      strokeOpacity: 0.4,
      strokeWeight: 2,
      fillColor: window.swirrl.viewHelpers.getRgbStringForScore(lsoaScore, minScore, maxScore),
      fillOpacity: 0.5
    });

    polys[lat + "," + lng] = poly; // store this poly against a lat,lng key
    poly.setMap(map);
    google.maps.event.addListener(poly, 'click', function(e) {

      // unselect the previous selection by setting it's weight back to one.
      if (selectedPoly) {
        selectedPoly.strokeWeight = 2;
        selectedPoly.strokeOpacity = 0.4;
        // reset onto the map to force a redraw
        selectedPoly.setMap(null);
        selectedPoly.setMap(map);
      }

      // redraw the polygon with a thicker border
      poly.strokeWeight = 5;
      poly.strokeOpacity = 0.6;
      // reset onto the map to force a redraw
      poly.setMap(null);
      poly.setMap(map);

      selectedPoly = poly; // remember which one it was.

      // raise a custom event.
      $(self).trigger('polygonClick', [lsoaNotation, data]);
    });

  };

  window.swirrl.MapManager = MapManager;
})();