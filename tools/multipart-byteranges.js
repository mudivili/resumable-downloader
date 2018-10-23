const http = require('http');
const lodashChunk = require('lodash.chunk');

async function makeRangeRequests() {

  const details = await headRequest();
  console.log(details);

  const ranges = generateRanges(500000, 10000);
  const chunks = [];
  let chunksTotalLength = 0;

  for(let range of ranges) {
    const chunk = await makeRangeRequest(range);
    chunksTotalLength += chunk.length;
  }

  console.log(`Downloaded all ranges. Total downloaded size: ${chunksTotalLength}`);

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
      hostname: 'fr5.seedr.cc',
      path: '/ff_get/363113508/Miss.Potter.2006.720p.BluRay.x264-[YTS.AM].mp4?st=ZgmpNPc1jKctEhZ-Y_0vMA&e=1540349308',
      method: 'GET',
      headers: {
        'Range': rangeHeader
      }
    };
    // console.log(`Downloading ${rangeHeader}`, options);

    const request = require('https').request(options, (response) => {

      const chunks = [];
      let chunksTotalLength = 0;

      response.on('data', (chunk) => {
        chunks.push(chunk);
        chunksTotalLength += chunk.length;
      });

      response.on('end', () => {

        if (response.statusCode === 404) {
          if(range.retry === 1) {
            console.log(response.headers);
          }
          return makeRangeRequest({ ...range, retry: (range.retry || 0) + 1 });
        }

        console.log(`Response for url: ${options.hostname}${options.path} for range: ${rangeHeader}. 
          Status: ${response.statusCode}. 
          Retry: ${range.retry || 0}`, response.headers);

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
      hostname: 'fr5.seedr.cc',
      // port: 443,
      path: '/ff_get/363113508/Miss.Potter.2006.720p.BluRay.x264-[YTS.AM].mp4?st=ZgmpNPc1jKctEhZ-Y_0vMA&e=1540349308',
      method: 'GET',
      headers: {
        'Range': 'bytes=0-50'
      }
    };
    const request = require('https').request(options, (response) => {

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
      hostname: 'fr5.seedr.cc',
      // port: 443,
      path: '/ff_get/363113508/Miss.Potter.2006.720p.BluRay.x264-[YTS.AM].mp4?st=ZgmpNPc1jKctEhZ-Y_0vMA&e=1540349308',
      method: 'HEAD'
    };
    const request = require('https').request(options, (response) => {

      console.log(`HEAD STATUS: ${response.statusCode}`);

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