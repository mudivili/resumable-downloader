const EventEmitter = require('events');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const http = require('http');
const debug = require('debug')('RD:PartDownloader');

const progress = require('progress-stream');
const { Range } = require('http-range');
const lodashChunk = require('lodash.chunk');

const {
  generateRanges,
  makeRangeRequest,
  makeRangeRequests,
  getFileSize,
  getWritableFileDescriptor,
  closeFileDescriptor,
  writeBufferToFileDescriptor
} = require('./util');

class PartDownloader extends EventEmitter {

  constructor(options) {

    super();

    this.source = options.source;
    this.destination = options.destination;
    this.contentLength = options.contentLength;
    this.maximumParallelRequests = options.parallel;
    this.cacheLimit = (options.cacheSize * 1000000);
    this.auth = options.auth;

  }

  async start() {

    try {

      const url = this.source;
      const fileSize = await getFileSize(this.destination);
      const rangeSize = Math.floor(this.cacheLimit / this.maximumParallelRequests);
      const ranges = generateRanges(this.contentLength - fileSize, rangeSize, fileSize);
      const rangeChunks = lodashChunk(ranges, this.maximumParallelRequests);
      const options = {
        hostname: this.source.hostname,
        port: this.source.port,
        pathname: this.source.pathname + this.source.search
        // httpAgent: new http.Agent({ keepAlive: true })
      };
      const fileDescriptor = await getWritableFileDescriptor(this.destination);
      const startTime = Date.now();

      let writtenBytes = 0;

      console.log(`Downloading ${this.source.toString()} with ${this.maximumParallelRequests} parallel requests`);
      debug(`Bytes to fetch: ${this.contentLength - fileSize}. Total number of batches: ${rangeChunks.length}. Bytes per chunk: ${rangeSize}`);

      this.emit('start', {
        length: this.contentLength,
        transferred: fileSize,
        percentage: (fileSize / this.contentLength) * 100,
        ...options
      });

      for (let ranges of rangeChunks) {

        const responseChunk = await makeRangeRequests({ url, ranges, auth: this.auth });
        const isAllBytesWritten = await writeBufferToFileDescriptor(fileDescriptor, responseChunk, writtenBytes);

        writtenBytes += responseChunk.length;

        this.emit('progress', {
          length: this.contentLength,
          transferred: writtenBytes,
          speed: writtenBytes / ((Date.now() - startTime) / 1000),
          percentage: ((fileSize + writtenBytes) / this.contentLength) * 100
        });

      }

      await closeFileDescriptor(fileDescriptor);

      this.emit('end');

    } catch (exception) {
      debug(exception);
      this.emit('error', exception);

    }

  }

}

module.exports = PartDownloader;