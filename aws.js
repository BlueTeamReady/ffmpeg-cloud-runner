#!/usr/bin/env node

'use strict';

const async = require('async');
const AWS = require('aws-sdk'); 
const fs = require('fs');
const path = require('path');
const process = require('process');
const shortid = require('shortid');
const util = require('util');
const Transcoder = require('./src/Transcoder.js');

var s3 = new AWS.S3();
var sns = new AWS.SNS();

// Include binaries shipped with Lambda on the PATH
process.env['PATH'] = process.env['PATH'] + ":" + process.env['LAMBDA_TASK_ROOT'];
//console.log(process.env['PATH']);

function LambdaRunner(event) {
    this.event = event;
    
    var tempBasePath = '/tmp/'; // default

    if (process.env['TEMP'] !== undefined) {
        // Windows, untested
        tempBasePath = process.env['TEMP']+"/";
    } else if (process.env['TMPDIR'] !== undefined) {
        // some linux
        tempBasePath = process.env['TMPDIR']+"/";
    }
    
    var srcExt = path.parse(event.source.key).ext;
    var destExt = path.parse(event.destination.key).ext;
    
    //this.tmpSrcFilename = event.source.key;
    this.tmpSrcFilename = shortid.generate()+srcExt;
    this.tmpSrcPath = tempBasePath+this.tmpSrcFilename;
    //this.tmpDestFilename = event.destination.key;
    this.tmpDestFilename = shortid.generate()+destExt;
    this.tmpDestPath = tempBasePath+this.tmpDestFilename;
}

LambdaRunner.prototype.getEvent = function(val) {
    return this.event;
}

LambdaRunner.prototype.validateEvent = function() {
    
}

LambdaRunner.prototype.validateDestination = function(callback) {
    s3.headObject({
        Bucket: this.event.destination.bucket,
        Key: this.event.destination.key
    }, function (err, data) {
        if (err) {
            callback(null, data);
        } else {
            // If no error, this file exists, which is invalid
            callback({message: "Destination file already exists."}, data);
        }
    });
}

LambdaRunner.prototype.download = function(callback) {
    var self = this;
    
    s3.getObject({
        Bucket: this.event.source.bucket,
        Key: this.event.source.key
    }, function (err, data) {
        if (err) {
            //console.error(error, error.stack);
            callback(err);
        } else {
            fs.writeFile(self.tmpSrcPath, data.Body, function() {
                console.log("Temp file written to %s", self.tmpSrcPath);
                callback(null);
            });
        }
    });
}

LambdaRunner.prototype.transcode = function(callback) {
    var input = this.tmpSrcPath;
    var output = this.tmpDestPath;
    var profile = {
        "video": {
            //"codec": "",
            "scale": {
                "w": 640,
                "h": 320
            },
            "bitrate": {
                "isVariable": true,
                "target": "1M"
            }
        },
        "audio": {
            // "codec": ""
        }
    };
    
    var webm = profile;
    webm.video.codec = "libvpx";
    webm.audio.codec = "libvorbis";
    
    var finalProfile = null;
    
    if (this.event.format == 'webm') {
        finalProfile = webm;
    }
    
    var transcoder = new Transcoder();

    transcoder.setInput(input);
    transcoder.setOutput(output)
    transcoder.setProfile(finalProfile);
    
    transcoder.transcode(callback);
}

LambdaRunner.prototype.upload = function(callback) {
     // Upload result to destination path
    var body = fs.createReadStream(this.tmpDestPath);
    var s3obj = new AWS.S3({params: {Bucket: this.event.destination.bucket, Key: this.event.destination.key}});
    
    s3obj.upload({Body: body}).
        on('httpUploadProgress', function(evt) { console.log(evt); }).
        send(function(err, data) {
            console.log(err, data)
            callback(err, data);
        });
}

LambdaRunner.prototype.cleanup = function() {
    // delete this.tmpSrcPath
    fs.unlink(this.tmpSrcPath, function(err) {if (err) {}});
    
    // delete this.tmpDestPath
    fs.unlink(this.tmpDestPath, function(err) {if (err) {}});
    
}

LambdaRunner.prototype.complete = function(error, executionTimeMs, callback) {
    if (this.event.onCompletion.sns.topic) {
        var event = {};

        if (this.event.onCompletion.sns.event) {
            event = this.event.onCompletion.sns.event;
        }
        
        // Copy the original event to the completion event payload
        event.initiator = JSON.parse(JSON.stringify(this.event));

        event.result = {
            executionTimeMs: executionTimeMs,
            error: error
        };
        
        //event.default = "Transcoding complete.";
        
        sns.publish({
            Message: JSON.stringify(event),
            //MessageStructure: 'json',
            TopicArn: this.event.onCompletion.sns.topic
        }, callback);
    }
}

exports.handler = function(event, context) {
    var lr = new LambdaRunner(event);
/*
    lr.complete(function(err, data) {
        console.error(err);
    });
    return;
*/
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(lr.getEvent(), {
        depth: 5
    }));
    
    var start = new Date();
    console.time('script');
    
    async.waterfall(
        [
            function validate(callback) {
                console.log("validate");
                
                lr.validateDestination(function(err, data) {
                    if (err) {
                        console.log('invalid');
                        callback(err);
                    } else {
                        console.log('valid');
                        callback(null);
                    }
                });
            },
            function download(callback) {
                console.log("download");
                
                lr.download(callback);
            },
            function transcode(callback) {
                console.log("transcode");
                
                lr.transcode(function (err, data) {
                    if (err) {
                        
                    } else {
                        console.log("Successfully ran command: %s", data.command);
                        console.log("Result located at %s", data.resultPath);
                    }
                    
                    callback(err);
                });
            },
            function upload(callback) {
                console.log("upload");
                
                lr.upload(callback);
            }
        ],
        function (err, data) {
            if (err) {
                console.error(err);
            } else {
                console.log(data);
            }
            
            lr.cleanup();
            
            var executionTimeMs = new Date() - start;
            console.timeEnd('script');
            
            lr.complete(err, executionTimeMs, function(err, data) {
                console.error(err);
            });
        }
    );
};

exports.handler({
  "format": "webm",
  "source": {"bucket":"bcreeve.pictures", "key": "anni001.mpg"},
  "destination": {"bucket":"bcreeve.pictures", "key": "outlambda.webm"},
  "onCompletion": {
    "sns": {
      "topic": "arn:aws:sns:us-east-1:162152020429:transcoding-done",
      "event": {
        "arbitrary": "passthrough"
      }
    }
  }
});