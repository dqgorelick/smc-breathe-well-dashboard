
(function () {
  var prodEndpoint = 'https://nqyzh7zcib.execute-api.us-east-1.amazonaws.com/prod/latest';
  var devEndpoint = 'https://utbo5or9sk.execute-api.us-east-1.amazonaws.com/dev/latest';

  var urlParams = new URLSearchParams(window.location.search);
  var customAQI = urlParams.get('aqi');
  var runDev = false 
  if (urlParams.get('dev')) {
    runDev = true
  }


  var purpleAirIdToLocalId = {
    // 2221: 1 // note: stubbed data
    92271: 10, // LDES Front Sensor
    91277: 10, // LDES Side Sensor
    92885: 10, // LDES Back Sensor
    92793: 16, // RES Left Side Sensor
    91809: 16, // RES Front Sensor
    90635: 16, // RES Right Side Sensor
    90599: 17, // PPES Back Sensor
    90655: 17, // PPES Right Sensor
    92291: 17, // PPES Front Sensor
    91347: 20, // SRMS Right Side Sensor
    92789: 20, // SRMS Front Sensor
    92821: 20, // SRMS Back Sensor
    92881: 14, // PHES Back Right Sensor
    91393: 14, // PHES Front Left Sensor
    92859: 14, // PHES Front Right Sensor
    93019: 5,  // CES Back Sensor
    90589: 5,  // CES Right Side Sensor
    85659: 5,  // CES Front Sensor
    90817: 25, // GMHS Front Sensor
    92289: 27, // FLA Front Sensor
    93001: 27, // FLA Back Left Sensor
    92285: 27, // FLA Back Right Sensor
    92281: 11, // LPES Back Sensor
    90881: 11, // LPES Left Side Sensor
    92245: 11, // LPES Front Sensor 
    90647: 7,  // GKES Right Sensor
    92559: 7,  // GKES Front Sensor
    92325: 7,  // GKES Left Sensor
    92969: 21, // EMS Front Right Sensor
    83993: 21, // EMS Back Left Sensor
    92689: 21, // EMS Front Left Sensor
    90687: 6,  // GHES Back Sensor
    92701: 6,  // GHES Front Right Sensor
    85473: 6,  // GHES Front Left Sensor
    92803: 17, // TCES Back Left Sensor
    91811: 17, // TCES Front Sensor
    91819: 17, // TCES Front Right Sensor
    92437: 4,  // EES Front Left Sensor
    92427: 4,  // EES Front Right Sensor
    92833: 8,  // HES Front Right Sensor
    90849: 8,  // HES Back Sensor
    85455: 8,  // HES Front Left Sensor
    92769: 26, // LHS Right Side Sensor
    92695: 26, // LHS Front Sensor
    92683: 26, // LHS Left Side Sensor
    92855: 22, // LMS Back Sensor 
    92415: 22, // LMS Front Sensor 
    93017: 22, // LMS Right Side Sensor 
    90645: 9,  // LES Front Left Sensor 
    92745: 9,  // LES Front Right Sensor 
    83855: 9,  // LES Back Sensor 
    93027: 2,  // CWFD Front Left Sensor 
    90659: 2,  // CWFD Front Right Sensor 
    93015: 1,  // BES Front Sensor 
    93025: 1,  // BES Right Side Sensor 
    93013: 1,  // BES Back Sensor 
    92421: 3,  // DES Back Sensor 
    92425: 3,  // DES Right Side Sensor 
    93021: 3,  // DES Front Sensor 
    90629: 24, // CHS Back Sensor 
    91329: 24, // CHS Front Sensor 
    90641: 24, // CHS Left Side Sensor 
    92883: 19, // MBMS Back Sensor 
    92827: 19, // MBMS Front Sensor 
    89235: 13, // OES Front Right Sensor 
    92279: 13, // OES Back Sensor 
    92795: 13, // OES Front Left Sensor 
    92679: 12, // MES Back Sensor 
    92999: 12, // MES Left Side Sensor 
    92687: 12, // MES Front Sensor 
    92747: 18, // WMES Back Sensor 
    92785: 18, // WMES Left Side 
    91383: 18, // WMES Front Sensor
    92807: 35, // Jamie L. Roberts Stadium

    /*
    // note: LES Back Sensor not receiving 
    // not installed MBMS Left Side Sensor 
    // not seeing St Mary's College River Center 

    on map but not "registered" on spreadsheet
    
    SRMS Front Sensor
    SMRS Right Side Sensor
    SMRS Back Sensor
    */
  }

  var categories = {
    'green': {
      color: 'green',
      low: 0,
      high: 50,
      description: 'Good',
      guidance: 'Great day to be active outside!'
    },
    'yellow': {
      color: 'yellow',
      low: 51,
      high: 100,
      description: 'Moderate',
      guidance: 'Good day to be active outside!<br><br>Community members who are unusually sensitive to air pollution could have symptoms.<a href="#star">*</a>'
    },
    'orange': {
      color: 'orange',
      low: 101,
      high: 150,
      description: 'Unhealthy for Sensitive Groups',
      guidance: 'It’s OK to be active outside, especially for short activities such as recess and physical education (PE).<br><br>For longer activities such as sports or outdoor physical activities, take more breaks and do less intense activities.<br><br>Watch for symptoms and take action as needed.<a href="#star">*</a><br><br>Individuals should follow their asthma action plans and keep their quick-relief medicine handy.'
    },
    'red': {
      color: 'red',
      low: 151,
      high: 200,
      description: 'Unhealthy',
      guidance: 'For all outdoor activities, take more breaks and do less intense activities.<br><br>Consider moving longer or more intense activities indoors or rescheduling them to another day or time.<br><br>Watch for symptoms and take action as needed.<a href="#star">*</a><br><br>Individuals should follow their asthma action plans and keep their quick-relief medicine handy.'
    },
    'purple': {
      color: 'purple',
      low: 201,
      high: 300,
      description: 'Very Unhealthy',
      guidance: 'Move all activities indoors or reschedule them to another day.'
    },
    'maroon': {
      color: 'maroon',
      low: 301,
      high: 500,
      description: 'Hazardous',
      guidance: 'Move all activities indoors or reschedule them to another day.'
    }
  }

  var AqiToCategory = function (aqi) {
    if (aqi >= 0 && aqi < 51) {
      return categories['green']
    } else if (aqi >= 51 && aqi < 100) {
      return categories['yellow']
    } else if (aqi >= 101 && aqi < 151) {
      return categories['orange']
    } else if (aqi >= 151 && aqi < 201) {
      return categories['red']
    } else if (aqi >= 201 && aqi < 301) {
      return categories['purple']
    } else if (aqi >= 301) {
      return categories['maroon']
    }
  }

  var windDegreetoTextualDescription = function (degree) {
    if (degree > 337.5) return 'Northerly';
    if (degree > 292.5) return 'North Westerly';
    if (degree > 247.5) return 'Westerly';
    if (degree > 202.5) return 'South Westerly';
    if (degree > 157.5) return 'Southerly';
    if (degree > 122.5) return 'South Easterly';
    if (degree > 67.5) return 'Easterly';
    if (degree > 22.5) { return 'North Easterly'; }
    return 'Northerly';
  }

  var calculateAverageAQI = function (sensors) {
    var total = 0;
    sensors.forEach(function (sensor) {
      total += sensor['AQI']
    })
    return Math.ceil(total / sensors.length)
  }

  var createColor = function () {
    var rgb = Math.floor(Math.random() * 3)
    return (
      'rgb('
      + Math.random() * 255 * (rgb === 0 ? 0.5 : 1) + ','
      + Math.random() * 255 * (rgb === 1 ? 0.5 : 1) + ','
      + Math.random() * 255 * (rgb === 2 ? 0.5 : 1) + ')'
    )
  }

  var mapLayers = {
    'highSchool':
      [
        {
          data: './assets/geojson/sch_hs_24_18_180303.geojson',
          name: 'Chopticon High School District',
          fill: createColor()
        },
        {
          data: './assets/geojson/sch_hs_24_18_180306.geojson',
          name: 'Leonardtown High School District',
          fill: createColor()
        },
        {
          data: './assets/geojson/sch_hs_24_18_180801.geojson',
          name: 'Great Mills High School District',
          fill: createColor()
        }
      ]
  }


  var getMarkerAqiAverage = function (data) {
    var sum = 0;
    data.forEach(function(d) {
      sum += d.AQI
    })
    return sum/data.length
  }

  var displayMarkerData = function (data) {
    var finalString = ''
    data.forEach(function(d) {
      finalString += '<p>' + d.Label + ' AQI: ' + d.AQI + '</p>'
    })
    return finalString
  }

  var loadMap = function (sensorData) {
    console.log('in loading map')
    mapboxgl.accessToken = 'pk.eyJ1IjoiZHFnb3JlbGljayIsImEiOiJja2k0c242OHAxd291MzBwZWMwbDB1cjA3In0.W5Cq9wArOm8vGVSEgE7ajQ';
    var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-76.549982, 38.297894],
      zoom: 9,
      minZoom: 8,
    });

    var highSchoolsVisible = true;
    
    var toggleHighSchools = function(map) {
      for (var i = 0; i < mapLayers['highSchool'].length; i++) {
        map.setLayoutProperty('highSchool' + i, 'visibility', highSchoolsVisible ? 'none' : 'visible')
      }
      highSchoolsVisible = !highSchoolsVisible;
    }

    var addMapLayers = function (map) {
      Object.keys(mapLayers).forEach(function (schoolType) {
        mapLayers[schoolType].forEach(function (layer, index) {
          var id = schoolType + index
          map.addSource(id, {
            'type': 'geojson',
            'data': layer.data
          });
          map.addLayer({
            'id': id,
            'type': 'fill',
            'source': id,
            'layout': {},
            'paint': {
              'fill-color': layer.fill,
              'fill-opacity': 0.3
            }
          });
          // map.on('click', id, function (e) {
          //   new mapboxgl.Popup()
          //     .setHTML(layer.name)
          //     .setLngLat([e.lngLat['lng'], e.lngLat['lat']])
          //     .addTo(map);
          // });
        })
      })
      toggleHighSchools(map);
    }

    $('.toggleHighSchools').click(function() {toggleHighSchools(map)})
    
    map.on('load', function () {
      map.addControl(new mapboxgl.NavigationControl());

      console.log('in map.on(load)')
      addMapLayers(map)
      sensorData.data.features.forEach(function (marker) {
        // create a HTML element for each feature
        var el = document.createElement('div');
        el.className = 'marker';

        if (marker.data.length) {
          var category = AqiToCategory(getMarkerAqiAverage(marker.data))
          el.className = 'marker aqi-' + category.color
        }
          // create the popup
        var markerPopup = new mapboxgl.Popup({offset: 25}).setHTML('<div><p>' + marker.properties.description + '</p><p>' 
        + (marker.data.length ? displayMarkerData(marker.data) : 'Site offline') + '</p></div>');
        // make a marker for each feature and add to the map
        new mapboxgl.Marker(el)
          .setLngLat(marker.geometry.coordinates)
          .setPopup(markerPopup)
          .addTo(map)
      })
    });
  }

  var trailerUpdatedTime = undefined;

  var updateLatest = function () {
    var endpoint = prodEndpoint;
    if (runDev) {
      endpoint = devEndpoint;
      console.log('RUNNING DEV ENDPOINT');
    }
    console.log('getting latest from endpoint: ', endpoint)
    $.getJSON(endpoint, function (data) {
      var AQI = calculateAverageAQI(data.smchdSensors.data)
      if (customAQI) {
        AQI = parseInt(customAQI)
      }
      var category = AqiToCategory(AQI)
      var timeZone = "America/New_York";
      var format = "MM/DD/YYYY h:mm";
      var trailerUpdated = moment.tz(data.trailer['DATE'], format, timeZone);

      $('.aqi-index').text(AQI)
      $('.aqi-flag').attr("src", 'assets/flag-' + category.color.toLowerCase() + '.png')
      $('.aqi-description').text(category.color + ' = ' + category.description)
      $('.aqi-description-extended').html(category.guidance)
      // weather 
      $('.weather-conditions').text(data.weather.data.weather[0].main + ' - ' + data.weather.data.weather[0].description)
      $('.weather-main').text(data.weather.data.main.temp.toFixed(1) + 'º')
      $('.weather-wind').text(data.weather.data.wind.speed + 'mph ')
      $('.weather-wind-info').text(windDegreetoTextualDescription(data.weather.data.deg))
      $('.weather-feels-line').text(' ' + data.weather.data.main.feels_like.toFixed(1) + 'º ')
      $('.weather-low').text(' ' + data.weather.data.main.temp_min.toFixed(1) + 'º ')
      $('.weather-high').text(' ' + data.weather.data.main.temp_max.toFixed(1) + 'º ')
      $('.weather-sunrise').text(moment(data.weather.data.sunrise * 1000).format('LT') + ', ' + moment(data.weather.data.sunrise * 1000).fromNow())
      $('.weather-sunset').text(moment(data.weather.data.sunset * 1000).format('LT') + ', ' + moment(data.weather.data.sunset * 1000).fromNow())
      $('.updated').text('Updated ' + moment(data.timestamp).fromNow())
      // trailer
      $('.trailer-weather-main').text(parseFloat(data.trailer['TEMP_C']).toFixed(1) + 'º')
      $('.trailer-weather-wind').text(data.trailer['WS_M/H'] + 'mph ')
      $('.trailer-humidity').text(parseFloat(data.trailer['RHUM_PERCENT']).toFixed(2) + '%')
      $('.trailer-precip').text(data.trailer['PRECIP_MM'] + 'mm')
      $('.trailer-weather-wind-info').text(windDegreetoTextualDescription(parseFloat(data.trailer['WD_DEGREES'])))
      $('.trailer-updated').text('Updated ' + trailerUpdated.fromNow() + ' (updated hourly)')
      trailerUpdatedTime = trailerUpdated.fromNow() + ' (updated hourly)'

      var mapData = SensorLocations
      data.smchdSensors.data.forEach(function (sensorData) {
        if (purpleAirIdToLocalId[sensorData['ID']] !== undefined) {
          var matchedIndex = SensorLocations.data.features.findIndex(function (x) { return x.properties.id === purpleAirIdToLocalId[sensorData['ID']] })
          if (matchedIndex !== -1) {
            mapData.data.features[matchedIndex].data.push(sensorData)
          }
        }
      })
      if(data.trailer.AQI) {
        var trailerIndex = SensorLocations.data.features.findIndex(function (x) { return x.properties.id === 33})
        mapData.data.features[trailerIndex].data.push({'AQI': data.trailer.AQI, 'Label': 'Trailer weather station'})
      }
      console.log('loading map called')
      loadMap(mapData)

    })
  }

  updateLatest()
})()