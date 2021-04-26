const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const moment = require('moment')

const calculateAQI = require('./calculateAQI')

const UPLOAD_BUCKET = process.env.BUCKET;
const weatherApiKey = process.env.OPENWEATHERMAP_API_KEY;
const SENSOR_DATA_BUCKET = process.env.SENSOR_DATA_BUCKET;

const s3 = new AWS.S3();

const getTrailerLatest = () => {
  return new Promise((resolve, reject) => {
    try {
      s3.listObjects({
        Bucket: SENSOR_DATA_BUCKET,
        Delimiter: '/'
      }, function (err, data) {
        if (err) {
          console.log(err)
          throw new Error(err)
        }
        const TTL = 7 * 24 * 60 * 60 * 1000 // 1 week
        const toDelete = [];
        const isoPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/
        const now = moment(new Date())
        let leastDistance = Infinity;
        let latestFile;
        // get latest file
        for (let i = 0; i < data.Contents.length; i++) {
          const lastModified = JSON.stringify(data.Contents[i].LastModified)
          const key = data.Contents[i].Key
          try {
            if (lastModified.match(isoPattern) !== null) {
              const created = moment(lastModified.match(isoPattern)[0])
              const difference = moment.duration(now.diff(created));
              if (difference < leastDistance) {
                leastDistance = difference
                latestFile = data.Contents[i].Key
              }
              // if (difference > TTL) {
              //   toDelete.push(key)
              // }
            }
          } catch (err) {
            console.log(err)
            throw new Error(err)
          }
        }
        // delete objects older than 1 week
        // const objectsToDelete = toDelete.map(key => {return {Key: key}});
        // var deleteParam = {
        //     Bucket: 'bucket-name',
        //     Delete: {
        //         Objects: objectsToDelete
        //     }
        // };    
        // s3.deleteObjects(deleteParam, function(err, data) {
        //     if (err) {
        //       console.log(err, err.stack);
        //     } else {
        //       console.log('delete', data);
        //     } 
        // });
        // get file contents of latest
        s3.getObject({
          Bucket: SENSOR_DATA_BUCKET,
          Key: latestFile
        },  function (err, data) {
          if (err) {
            throw new Error(err)
          }
          const final = {}
          // temporary fix
          let windSpeedFound = false
          data.Body.toString('utf-8').split('\n').map((line) => {
            const values = line.split('|')
            if (final['DATE'] === undefined) {
              final['DATE'] = values[2]
            }
            if (values.length > 1) {
              let key = values[1]
              if (values[1] === 'WS_M/H' && !windSpeedFound) {
                windSpeedFound = true
                key = 'WS_M/H_current'
              }
              final[key] = values[4]
              final['AQI'] = calculateAQI.aqiFromPM(parseFloat(final['PM2.5_UG/M3']))
            }
          })
          resolve(final)
        })
      })
    } catch (err) {
      reject(err.message)
    }
  })
}

const getLatestWeatherData = () => {
  return new Promise((resolve, reject) => {
    let finalWeatherData
    // fetches weather for "Callaway, MD"
    fetch(`http://api.openweathermap.org/data/2.5/weather?zip=20620,US&appid=${weatherApiKey}&units=imperial`)
      .then(res => res.json())
      .then(weatherData => {
        if (weatherData.cod !== 200) {
          throw new Error(weatherData.message)
        }
        finalWeatherData = {
          wind: weatherData.wind,
          main: weatherData.main,
          sunrise: weatherData.sys.sunrise,
          sunset: weatherData.sys.sunset,
          weather: weatherData.weather
        }
        resolve({
          error: false,
          data: finalWeatherData
        })
      }).catch(err => {
        reject({
          error: true,
          message: err.message,
          data: finalWeatherData
        })
      });

  })
}

const getLatestPurpleAirData = (sensorIDs) => {
  return new Promise((resolve, reject) => {
    const formattedSensorIds = sensorIDs.reduce((finalString, currentValue, index, source) => {
      return index < source.length ? finalString + '|' + currentValue.toString() : finalString + currentValue
    })
    let finalSensorData = []
    fetch(`https://www.purpleair.com/json?show=${formattedSensorIds}`)
      .then(res => res.json())
      .then(sensorDataJSON => {
        console.log(sensorDataJSON)
        if (sensorDataJSON.code) {
          if (sensorDataJSON.code !== 200) {
            throw new Error(sensorDataJSON.message)
          }
        }
        sensorIDs.forEach((sensorID, index) => {
          const reading = sensorDataJSON.results.find(data => data.ID === sensorID)
          if (reading !== undefined) {
            let stats = JSON.parse(reading['Stats'])
            console.log(sensorID, reading['Label'], reading['pm2_5_atm'], stats['v5'], calculateAQI.aqiFromPM(parseFloat(stats['v5'])))
            finalSensorData.push({
              ID: sensorID,
              pm2_5_current: parseFloat(reading['pm2_5_atm']),
              pm2_5_24h_average: stats['v5'],
              Label: reading['Label'],
              AQI: calculateAQI.aqiFromPM(parseFloat(stats['v5']))
            })
          } else {
            console.log('could not find sensor data for ID', sensorID)
          }
        })
        resolve({
          error: false,
          data: finalSensorData
        })
      }).catch(err => {
        reject({
          error: true,
          message: err.message,
          data: finalSensorData
        })
      });
  })
}

module.exports.getLatest = (event, context, callback) => {
  s3.getObject(
    {
      Bucket: UPLOAD_BUCKET,
      Key: `latest.json`
    },
    function (err, data) {
      if (err) {
        callback(`Error fetching latest data ${JSON.stringify(err)}`)
      }
      const response = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', // Required for CORS support to work
          'Access-Control-Allow-Credentials': true, // Required for cookies, authorization headers with HTTPS
        },
        body: data.Body.toString('utf8'),
      };
      callback(null, response);
    }
  )
}

module.exports.updateLatest = async (event, context, callback) => {
  const communitySensorIDs = [2221, 8244, 8248] // TODO: get this dynamically
  let communitySensorData = []
  // fetch community sensor data
  try {
    communitySensorData = await getLatestPurpleAirData(communitySensorIDs)
  } catch (err) {
    console.log(err)
  }

  const smchdSensorIDs = [
    92271, // ID=10, LDES Front Sensor
    91277, // ID=10, LDES Side Sensor
    92885, // ID=10, LDES Back Sensor
    92793, // ID=16, RES Left Side Sensor
    91809, // ID=16, RES Front Sensor
    90635, // ID=16, RES Right Side Sensor
    90599, // ID=17, PPES Back Sensor
    90655, // ID=17, PPES Right Sensor
    92291, // ID=17, PPES Front Sensor
    91347, // ID=20, SRMS Right Side Sensor
    92789, // ID=20, SRMS Front Sensor
    92821, // ID=20, SRMS Back Sensor
    92881, // ID=14, PHES Back Right Sensor
    91393, // ID=14, PHES Front Left Sensor
    92859, // ID=14, PHES Front Right Sensor
    93019, // ID=5,  CES Back Sensor
    90589, // ID=5,  CES Right Side Sensor
    85659, // ID=5,  CES Front Sensor
    90817, // ID=25, GMHS Front Sensor
    92289, // ID=27, FLA Front Sensor
    93001, // ID=27, FLA Back Left Sensor
    92285, // ID=27, FLA Back Right Sensor
    92281, // ID=11, LPES Back Sensor
    90881, // ID=11, LPES Left Side Sensor
    92245, // ID=11, LPES Front Sensor 
    90647, // ID=7,  GKES Right Sensor
    92559, // ID=7,  GKES Front Sensor
    92325, // ID=7,  GKES Left Sensor
    92969, // ID=21, EMS Front Right Sensor
    83993, // ID=21, EMS Back Left Sensor
    92689, // ID=21, EMS Front Left Sensor
    90687, // ID=6,  GHES Back Sensor
    92701, // ID=6,  GHES Front Right Sensor
    85473, // ID=6,  GHES Front Left Sensor
    92803, // ID=17, TCES Back Left Sensor
    91811, // ID=17, TCES Front Sensor
    91819, // ID=17, TCES Front Right Sensor
    92437, // ID=4,  EES Front Left Sensor
    92427, // ID=4,  EES Front Right Sensor
    92833, // ID=8,  HES Front Right Sensor
    90849, // ID=8,  HES Back Sensor
    85455, // ID=8,  HES Front Left Sensor
    92769, // ID=26, LHS Right Side Sensor
    92695, // ID=26, LHS Front Sensor
    92683, // ID=26, LHS Left Side Sensor
    92855, // ID=22, LMS Back Sensor 
    92415, // ID=22, LMS Front Sensor 
    93017, // ID=22, LMS Right Side Sensor 
    90645, // ID=9,  LES Front Left Sensor 
    92745, // ID=9,  LES Front Right Sensor 
    83855, // ID=9,  LES Back Sensor 
    93027, // ID=2,  CWFD Front Left Sensor 
    90659, // ID=2,  CWFD Front Right Sensor 
    93015, // ID=1,  BES Front Sensor 
    93025, // ID=1,  BES Right Side Sensor 
    93013, // ID=1,  BES Back Sensor 
    92421, // ID=3,  DES Back Sensor 
    92425, // ID=3,  DES Right Side Sensor 
    93021, // ID=3,  DES Front Sensor 
    90629, // ID=24, CHS Back Sensor 
    91329, // ID=24, CHS Front Sensor 
    90641, // ID=24, CHS Left Side Sensor 
    92883, // ID=19, MBMS Back Sensor 
    92827, // ID=19, MBMS Front Sensor 
    89235, // ID=13, OES Front Right Sensor 
    92279, // ID=13, OES Back Sensor 
    92795, // ID=13, OES Front Left Sensor 
    92679, // ID=12, MES Back Sensor 
    92999, // ID=12, MES Left Side Sensor 
    92687, // ID=12, MES Front Sensor 
    92747, // ID=18, WMES Back Sensor 
    92785, // ID=18, WMES Left Side 
    91383, // ID=18, WMES Front Sensor
    92807 // ID=35, Jamie L. Roberts Stadium
  ]

  try {
    smchdSensorData = await getLatestPurpleAirData(smchdSensorIDs)
  } catch (err) {
    console.log(err)
  }

  // fetch weather data 
  let weatherData = []
  // fetch community sensor data
  try {
    weatherData = await getLatestWeatherData()
  } catch (err) {
    console.log(err)
  }

  let trailerData = {};
  try {
    trailerData = await getTrailerLatest()
  } catch (err) {
    console.log(err)
    trailerData = err
  }

  const latestData = {
    timestamp: Date.now(),
    communitySensors: communitySensorData,
    smchdSensors: smchdSensorData,
    weather: weatherData,
    trailer: trailerData
  }

  console.log('uploading...')
  const params = {
    Bucket: UPLOAD_BUCKET,
    Key: `latest.json`,
    Body: JSON.stringify(latestData),
    ContentType: 'application/json'
  }
  try {
    let s3Response = await s3.upload(params).promise()
    console.log(`File uploaded to S3 at ${s3Response.Bucket} bucket. File`)
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Uploaded!',
        data: s3Response
      }),
    });
  } catch (err) {
    callback(`Error upload ${JSON.stringify(err)}`)
  }
};
