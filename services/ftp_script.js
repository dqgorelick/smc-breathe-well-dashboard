const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const UPLOAD_BUCKET = 'breathewell-trailer-sensor-data'
const dirPath = '/etc/httpd';

/*
1. Get most recent filename
2. List directory, see if the file exists 
3. If it does not exist
*/

const getMostRecentFile = (dir) => {
  const files = orderReccentFiles(dir);
  return files.length ? files[0] : undefined;
};

const orderReccentFiles = (dir) => {
  return fs.readdirSync(dir)
    .filter(file => fs.lstatSync(path.join(dir, file)).isFile())
    .map(file => ({ file, mtime: fs.lstatSync(path.join(dir, file)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
};


const latestSensorData = getMostRecentFile(dirPath)
const sensorData = fs.readFileSync(path.join('/etc/httpd/', latestSensorData.file));

console.log('latest', latestSensorData.file)

const params = {
  Bucket: UPLOAD_BUCKET,
  Key: latestSensorData.file,
  Body: sensorData
};

console.log('listing dir...')
s3.listObjects({
  Bucket: UPLOAD_BUCKET,
  Delimiter: '/'
}, function (e, data) {
  console.log('files listed')
  if (e) {
    console.log('error listing files', e)
  }
  let foundFile = false
  for (let i = 0; i < data.Contents.length; i++) {
    console.log('files', data.Contents[i].Key)
    if (data.Contents[i].Key === latestSensorData.file) {
      foundFile = true
    }
  }
  if (!foundFile) {
    console.log('saving file')
    s3.putObject(params, function (err, data) {
      if (err) {
        console.log('failed to save', err)
        return
      }
      console.log('saved latest!', data)
    })
  } else {
    console.log('no file to save')
  }
})
