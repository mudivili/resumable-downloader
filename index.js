const getopts = require('getopts');

const ResumableDownloader = require('./lib');

const options = getopts(process.argv.slice(2), {
  alias: {
    r: 'resume'
  },
  boolean: ['r'],
  default: {
    r: true
  }
});
const fileURL = options._[0];
const downloader = new ResumableDownloader({ fileURL, ...options });
downloader.on('progress', (info) => {
  // console.log(info);
});
downloader.on('info', (info) => {
  console.log(info);
});
downloader.on('error', (error) => {
  console.log(error);
  process.exit();
});
downloader.on('end', (info) => {

});
downloader.start();