const fs = require('fs');
const path = require('path');
const http = require('http');
const debug = require('debug')('RD:util');

function getNextFileName(filename) {

  const versionSegmentStart = filename.lastIndexOf('(');
  const versionSegmentEnd = filename.lastIndexOf(')');

  if (versionSegmentStart === -1 || versionSegmentStart > versionSegmentEnd) {
    // Not versoined yet! Create first version
    return `${filename} (1)`;
  }

  const nextVersionString = filename.substring(versionSegmentStart + 1, versionSegmentEnd);

  if (nextVersionString === '') {
    // Not versoined yet! Create first version
    return `${filename} (1)`;
  }

  const nextVersion = (+nextVersionString) + 1;

  if (isNaN(nextVersion)) {
    // Not versoined yet! Create first version
    return `${filename} (1)`;
  }

  const filenameWithVersionSuffix = filename.substring(0, versionSegmentStart - 1);

  return `${filenameWithVersionSuffix} (${nextVersion})`;

}

async function getWritableFileName(filename, extension) {

  const exists = await isFileExists(path.resolve(filename + '.' + extension));

  if (exists) {

    const newFilename = getNextFileName(filename);

    return getWritableFileName(newFilename, extension);

  }

  return filename;

}

async function isFileExists(filePath) {

  return new Promise((resolve) => {

    fs.access(filePath, fs.constants.F_OK | fs.constants.W_OK, (error) => {
      resolve(!error);
    });

  });

}

async function renameFile(currentFilePath, newFilePath) {

  return new Promise((resolve, reject) => {

    fs.rename(currentFilePath, newFilePath, (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });

  });

}

async function tryRemoveFile(filePath) {

  const exists = await isFileExists(filePath);

  if (!exists) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {

    fs.unlink(filePath, (error) => {
      if (error) {
        return reject(error);
      }
      resolve();
    });

  });

}

function generateRanges(totalLength, rangeSize, offset = 0) {

  const numberOfRanges = Math.floor(totalLength / rangeSize);
  const balanceRange = totalLength % rangeSize;

  const ranges = (new Array(numberOfRanges)).fill('').map((value, index) => {
    const start = (index * rangeSize) + (offset ? offset + 1 : 0);
    const end = (start + rangeSize) - 1;
    return {
      start,
      end
    };
  });

  if (balanceRange) {
    let start = ranges[ranges.length - 1].end + 1;
    let end = (numberOfRanges * rangeSize) + (balanceRange - 1) + offset;
    ranges.push({
      start,
      end
    });
  }

  return ranges;

}

async function makeRangeRequest({ hostname, port = 80, pathname, range, httpAgent }) {

  return new Promise((resolve, reject) => {

    const rangeHeader = `bytes=${range.start}-${range.end}`;
    const options = {
      hostname,
      port,
      path: pathname,
      method: 'GET',
      headers: {
        'Range': rangeHeader
      }
    };

    if (httpAgent) {
      options.agent = httpAgent;
    }

    debug(`Downloading ${rangeHeader}`);

    const request = http.request(options, (response) => {

      const chunks = [];
      let chunksTotalLength = 0;

      response.on('data', (chunk) => {
        chunks.push(chunk);
        chunksTotalLength += chunk.length;
      });

      response.on('end', () => {
        debug(`STATUS: ${response.statusCode}`);
        debug({
          contentRange: response.headers['content-range'],
          contentLength: response.headers['content-length'],
          chunksTotalLength
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

async function makeRangeRequests({ hostname, port, pathname, httpAgent, ranges }) {

  const rangePromises = ranges.map((range) => makeRangeRequest({
    hostname,
    port,
    pathname,
    httpAgent,
    range
  }));
  const chunks = await Promise.all(rangePromises);
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  debug(`Fetched size: ${totalLength} from ${hostname}${pathname}`);
  return Buffer.concat(chunks, totalLength);

}

async function getFileSize(filePath) {

  const exists = await isFileExists(filePath);

  if (!exists) {
    return Promise.resolve(0);
  }

  return new Promise((resolve, reject) => {

    fs.stat(filePath, (error, stats) => {

      if (error) {
        return reject(error);
      }

      resolve(stats.size);

    });

  });

}

async function getWritableFileDescriptor(filePath) {

  debug(`Retriving ${filePath} descriptor`);

  return new Promise((resolve, reject) => {

    fs.open(filePath, 'a', (error, fileDescriptor) => {

      if (error) {
        debug(error);
        return reject(error);
      }

      resolve(fileDescriptor);

    });

  });

}

async function closeFileDescriptor(filePath) {

  return new Promise((resolve, reject) => {

    fs.close(filePath, (error) => {

      if (error) {
        return reject(error);
      }

      resolve();

    });

  });

}

async function writeBufferToFileDescriptor(fileDescriptor, dataBuffer, writePosition) {

  debug(`Writing buffer size: ${dataBuffer.length} at position: ${writePosition} in ${fileDescriptor}`);

  return new Promise((resolve, reject) => {

    fs.write(fileDescriptor, dataBuffer, 0, dataBuffer.length, writePosition, (error, bytesWritten, buffer) => {

      if (error) {
        return reject(error);
      }

      resolve(bytesWritten === buffer.length);

    });

  });

}

async function getResourceDetails({ hostname, port = 80, pathname }) {

  return new Promise((resolve, reject) => {

    const options = {
      hostname: hostname,
      port,
      path: pathname,
      method: 'HEAD'
    };

    const request = http.request(options, (response) => {

      const result = {
        contentType: response.headers['content-type'],
        contentLength: +response.headers['content-length'],
        acceptRanges: response.headers['accept-ranges']
      };

      debug('Resource details: ', result)

      resolve(result);

    });

    request.on('error', (error) => {
      reject(error);
    });

    request.end();

  });

}

module.exports = {
  isFileExists,
  getNextFileName,
  getWritableFileName,
  renameFile,
  tryRemoveFile,
  generateRanges,
  makeRangeRequest,
  makeRangeRequests,
  getFileSize,
  getWritableFileDescriptor,
  closeFileDescriptor,
  writeBufferToFileDescriptor,
  getResourceDetails
};