
(function () {

  var urlParams = new URLSearchParams(window.location.search);
  var customAQI = urlParams.get('aqi');

  var purpleAirIdToLocalId = {
    // 2221: 1 // note: stubbed data
    92271: 10, // LDES Front Sensor
    91277: 10, // LDES Side Sensor
    92885: 10, // LDES Back Sensor
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
    $('.toggleHighSchools').click(function() {toggleHighSchools(map)})
    map.on('load', function () {
      map.addControl(new mapboxgl.NavigationControl());

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

  mapboxgl.accessToken = 'pk.eyJ1IjoiZHFnb3JlbGljayIsImEiOiJja2k0c242OHAxd291MzBwZWMwbDB1cjA3In0.W5Cq9wArOm8vGVSEgE7ajQ';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-76.549982, 38.297894],
    zoom: 9,
    minZoom: 8,
  });

  var updateLatest = function () {
    $.getJSON('https://nqyzh7zcib.execute-api.us-east-1.amazonaws.com/prod/latest', function (data) {
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
      loadMap(mapData)

    })
  }

  updateLatest()
})()