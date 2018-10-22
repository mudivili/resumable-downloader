const http = require('http');
const send = require('send');
// const path = require('path');
// const sampleFile = fs.createReadStream(path.resolve('./sample-file.mp4'));
const server = http.createServer((request, response) => {
  send(request, './sample-file-2.mp4')
    .pipe(response)
});

server.listen(3000, (error) => error && console.log(error));