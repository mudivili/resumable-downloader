const http = require('http');

async function makeRangeRequests() {

  const details = await headRequest();
  console.log(details);

  const ranges = generateRanges(details.contentLength, 10000);
  const chunks = [];
  let chunksTotalLength = 0;

  const rangeRequestPromises = ranges.map((range) => {
    return makeRangeRequest(range);
  });

  Promise.all(rangeRequestPromises).then((chunks) => {
    chunksTotalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
    console.log(`Downloaded all ranges. Total downloaded size: ${chunksTotalLength}`);
  });

}

function generateRanges(totalLength, rangeLength) {

  const rangesLength = Math.floor(totalLength / rangeLength);
  const balanceRange = totalLength % rangeLength;

  const ranges = (new Array(rangesLength)).fill('').map((value, index) => {
    const start = index * rangeLength;
    const end = (start + rangeLength) - 1;
    return {
      start,
      end
    };
  });

  if (balanceRange) {
    ranges.push({
      start: ranges[ranges.length - 1].end + 1,
      end: (rangesLength * rangeLength) + (balanceRange - 1)
    });
  }

  return ranges;

}

async function makeRangeRequest(range) {

  return new Promise((resolve, reject) => {

    const rangeHeader = `bytes=${range.start}-${range.end}`;
    const options = {
      hostname: 'i.imgur.com',
      port: 80,
      path: 'z4d4kWk.jpg',
      method: 'GET',
      headers: {
        'Range': rangeHeader
      }
    };
    console.log(`Downloading ${rangeHeader}`);

    const request = http.request(options, (response) => {

      const chunks = [];
      let chunksTotalLength = 0;

      response.on('data', (chunk) => {
        chunks.push(chunk);
        chunksTotalLength += chunk.length;
      });

      response.on('end', () => {
        console.log(`STATUS: ${response.statusCode}`);
        console.log({
          contentRange: response.headers['content-range'],
          contentLength: response.headers['content-length']
        });
        resolve(Buffer.concat(chunks, chunksTotalLength));
      });

    });

    request.on('error', (error) => {
      reject(error);
    });

    request.end();

  });

}

async function sampleRangeRequest() {

  return new Promise((resolve, reject) => {

    const options = {
      hostname: 'i.imgur.com',
      port: 80,
      path: 'z4d4kWk.jpg',
      method: 'GET',
      headers: {
        'Range': 'bytes=0-50'
      }
    };
    const request = http.request(options, (response) => {

      console.log(`STATUS: ${response.statusCode}`);
      console.log(response.headers);

      let size = 0;

      response.on('data', (chunk) => {
        size += chunk.length;
      });

      response.on('end', () => {
        console.log(`Download complete. Downloaded: ${size}. Total: ${response.headers['content-length']}`);
      });

    });

    request.on('error', (error) => {
      reject(error);
    });

    request.end();

  });

}

async function headRequest() {


  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'i.imgur.com',
      port: 80,
      path: 'z4d4kWk.jpg',
      method: 'HEAD',
      headers: {
        'Range': 'bytes=0-50'
      }
    };
    const request = http.request(options, (response) => {

      console.log(`STATUS: ${response.statusCode}`);

      resolve({
        contentType: response.headers['content-type'],
        contentLength: +response.headers['content-length'],
        acceptRanges: response.headers['accept-ranges']
      });

    });

    request.on('error', (error) => {
      reject(error);
    });

    request.end();
  });

}

makeRangeRequests();