const AWS = require('aws-sdk');
const moment = require('moment');

const calculateAQI = require('./calculateAQI')

const UPLOAD_BUCKET = process.env.BUCKET;
const weatherApiKey = process.env.OPENWEATHERMAP_API_KEY;
const SENSOR_DATA_BUCKET = process.env.TRAILER_SENSOR_DATA_BUCKET;

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
        // const TTL = 24 * 60 * 60 * 1000 // 24 hours
        // const toDelete = [];
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
              // TODO add TTL
              // if (difference > TTL) {
              //   toDelete.push(key)
              // }
            }
          } catch (err) {
            console.log(err)
            throw new Error(err)
          }
        }
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

  // fetch weather data 
  let weatherData = []
  // fetch community sensor data
  try {
    weatherData = await getLatestWeatherData()
  } catch (err) {
    console.log(err)
  }

  // fetch latest trailer sensor data 
  // let trailerData = {};
  // try {
  //   trailerData = await getTrailerLatest()
  // } catch (err) {
  //   console.log(err)
  // }

  const latestData = {
    timestamp: Date.now(),
    communitySensors: communitySensorData,
    weather: weatherData,
    // trailer: trailerData
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
