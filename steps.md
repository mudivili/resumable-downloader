
Steps:

Main:

* Create file name from url
* Check if file exist in destination folder.
* If exists, create a new filename by adding "(number)" before the extension.
* If not exists, use the actual file name.
* Check if server supports range requests
* If server supports range request & if .in-progress file exists, resume part download
* If server supports range request & if .in-progress file not exists, start part download
* If server does not support range request & if .in-progress file exists, delete the file & start full download
* Once download is completed, rename in-progress file name with actual file name.

Full download:

* Make HTTP get request with out range header
* Initialize progress notifier
* Pipe the response to .in-progress file

Part download:

* Generate ranges based on file content length.
* Make range requests with configured number of parallel requests to server.
* Write responses to .in-progress file, if the cached response length exceeds configured value.
* Once all response parts are received, write remaining cache to .in-progress file.

Part download ranges:

* 1000000 bytes cache, 10 parallel requests.
* Range = 1000000 / 10 = 100000

Notes:
1. Take care of using file name & extension from response headers
