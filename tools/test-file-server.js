const http = require('http');
const fs = require('fs');
const path = require('path');

const send = require('send');
const mime = require('mime');

const sampleFileFullPath = path.resolve(path.join(__dirname, './sample-file-2.mp4'));
const sampleFileStat = fs.statSync(sampleFileFullPath);
const sampleFileSize = sampleFileStat.size;
const sampleFileType = mime.getType(sampleFileFullPath);

const server = http.createServer((request, response) => {

  if (request.url === '/range-request-file.mp4') {
    console.log(request.url, sampleFileFullPath);
    return send(request, sampleFileFullPath)
      .pipe(response);
  }
  
  response.writeHead(200, {
    'Content-Type': sampleFileType,
    'Content-Length': sampleFileSize
  });

  fs.createReadStream(sampleFileFullPath).pipe(response);

});

server.listen(3000, (error) => error && console.log(error));