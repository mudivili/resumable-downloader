process.binding('http_parser').HTTPParser = require('http-parser-js').HTTPParser;
const getopts = require('getopts');
const { Bar, Presets } = require('cli-progress');
const colors = require('colors');

const ResumableDownloader = require('./lib');
const bar = new Bar({
  format: colors.red(' {bar}') + ' {percentage}% | ETA: {eta}s | {value}/{total} | Speed: {speed}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591'
}, Presets['shades_grey']);
const options = getopts(process.argv.slice(2), {
  alias: {
    r: 'resume',
    p: 'parallel',
    c: 'cache',
    a: 'auth'
  },
  string: ['a'],
  boolean: ['r'],
  number: ['p', 'c'],
  default: {
    r: true,
    parallel: 2,
    cache: 10,
    auth: ''
  }
});
const fileURL = options._[0];
const downloader = new ResumableDownloader({ fileURL, ...options });
downloader.on('start', (data) => {
  // console.log(data);
  bar.start(100, data.percentage, {
    speed: 'N/A'
  });
});
downloader.on('progress', (data) => {
  // console.log(data.percentage);
  bar.update(data.percentage.toFixed(2), {
    speed: (data.speed / 1000000).toFixed(2) + ' Mb/s'
  });
});
downloader.on('info', (data) => {
  console.log(data);
});
downloader.on('error', (error) => {
  console.log(error);
  process.exit();
});
downloader.on('end', (data) => {
  // console.log('end', data);
  bar.update(100);
  bar.stop();
});
downloader.start();