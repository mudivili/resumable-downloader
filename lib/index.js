const EventEmitter = require('events');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const http = require('http');
const debug = require('debug')('RD:ResumableDownloader');

const progress = require('progress-stream');
const { Range } = require('http-range');

const PartDownloader = require('./part-downloader');
const {
  getNextFileName,
  getWritableFileName,
  isFileExists,
  renameFile,
  tryRemoveFile,
  getResourceDetails
} = require('./util');



class ResumableDownloader extends EventEmitter {

  constructor({ fileURL, resume = true }) {
    super();
    this.fileURL = new URL(fileURL);
    this.resume = resume;
    this.filename = null;
    this.fileExtension = null;
    this.partialFilePath = null;
    this.filePath = null;
  }

  async start() {
    
    debug(`Downloading ${this.fileURL}`);

    await this.createFileName();

    const details = await getResourceDetails({
      hostname: this.fileURL.hostname,
      port: this.fileURL.port,
      pathname: this.fileURL.pathname + this.fileURL.search
    });

    if(!this.resume) {
      await tryRemoveFile(this.partialFilePath);
    }
    
    if(details.acceptRanges) {
      await this.startPartDownload(details);
    }
    else {
      await this.startFullDownload();
    }

    await this.renameDownloadedFile();

    debug(`File saved to ${this.filePath}`);

  }

  async renameDownloadedFile() {

    return renameFile(this.partialFilePath, this.filePath);

  }

  async createFileName() {

    const temp = this.fileURL.pathname.split('/').pop();
    const filename = temp.substring(0, temp.lastIndexOf('.'));

    this.fileExtension = temp.substring(temp.lastIndexOf('.') + 1, temp.length);
    this.filename = await getWritableFileName(filename, this.fileExtension);

    this.filePath = path.resolve(this.filename + '.' + this.fileExtension);
    this.partialFilePath = path.resolve(this.filename + '.' + 'in-progress');

    debug(`Filename: ${this.filename}.${this.fileExtension}. Partial file path: ${this.partialFilePath}`);

  }

  async startPartDownload(details) {

    const partDownloader = new PartDownloader({
      source: this.fileURL,
      destination: this.partialFilePath,
      ...details
    });

    partDownloader.on('progress', (data) => this.emit('progress', data));
    partDownloader.on('error', (error) => this.emit('error', error));
    partDownloader.on('info', (data) => this.emit('info', data));

    return partDownloader.start();
    
  }

  async startFullDownload() {

    await tryRemoveFile(this.partialFilePath);

    return new Promise((resolve, reject) => {

      const downloadDestinationStream = fs.createWriteStream(this.partialFilePath);
      const options = {
        hostname: this.fileURL.hostname,
        port: this.fileURL.port,
        path: this.fileURL.pathname + this.fileURL.search,
        method: 'GET'
      };
      const request = http.request(options, (response) => {

        const progressNotifier = progress({
          length: response.headers['content-length'],
          time: 100
        });

        progressNotifier.on('progress', (data) => this.emit('progress', data));

        response.pipe(progressNotifier).pipe(downloadDestinationStream);

        response.on('end', () => resolve());

      });

      request.on('error', (error) => {
        reject(error);
      });

      request.end();

    });

  }

}

module.exports = ResumableDownloader;