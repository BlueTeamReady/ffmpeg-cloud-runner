# ffmpeg-cloud-runner
Run ffmpeg commands anywhere, with ease.

## Features

- Designed to run anywhere: AWS Lambda, Google Cloud Functions (TODO), command line, your node project, etc.
- Modular profile-driven design.
- Customize output profiles and templated CLI commands.

## AWS Lambda

TODO: instructions

1. Set up a user with proper permissions, install AWS CLI, and (configure)[http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html] on your local environment.

### Testing locally

Let's say you have a user called 'ffmpeg-lambda' set up in `~/.aws/credentials`.

`$ AWS_PROFILE=ffmpeg-lambda LAMBDA_TASK_ROOT=./bin/ffmpeg node aws.js`

## Command Line

`node index.js transcode samples/anni001.mpg /tmp/out.webm profiles/transcode/640x320.json profiles/transcode/webm.json`

### Commands

- `transcode`