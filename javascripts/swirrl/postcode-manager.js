(function() {

  // the constructor.
  var PostcodeManager = function() {
    self = this;
  };

  // public api.
  PostcodeManager.prototype = {
    lookup: function(postcode) {
      var uppercasePostcode = postcode.split(' ').join('').toUpperCase() ;
      var url = 'http://opendatacommunities.org/resources/data.ordnancesurvey.co.uk/id/postcodeunit/' + uppercasePostcode + '?format=json';
      $.ajax(
        url,
        {
          success: function(data, textStatus, jqXHR)  {
            var rootKey = 'http://data.ordnancesurvey.co.uk/id/postcodeunit/'  + uppercasePostcode;
            var lat = data[rootKey]['http://www.w3.org/2003/01/geo/wgs84_pos#lat'][0]['value'];
            var lon = data[rootKey]['http://www.w3.org/2003/01/geo/wgs84_pos#long'][0]['value'];
            $(self).trigger('postcodeFound', [lat, lon]);
          },
          error: function() {
            $(self).trigger('invalidPostcode');

          },
          dataType: 'json'
        }
      )
    }
  };

  // private variables

  var self;

  window.swirrl.PostcodeManager = PostcodeManager;
})();