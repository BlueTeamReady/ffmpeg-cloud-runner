#!/usr/bin/env node

'use strict';

//var fs = require('fs');
const Handlebars = require('handlebars');
const program = require('commander');
const ProfileLoader = require('./src/ProfileLoader');
const Transcoder = require('./src/Transcoder.js');
const util = require('util');

// TODO: if path parameter is specified, add here? or add to path in shell?
const process = require('process');
process.env['PATH'] = process.env['PATH'] + ":" + __dirname+"/bin/ffmpeg";
console.log(process.env['PATH']);

let transcode = (options) => {
    console.log('in');
    console.log(options);
};


program
    .version('0.0.1')
    .option('-x, --xinput <path>','Path to the input media')
    .option('-v, --verbose','Enables verbose output')
    ;

program
   .command('transcode <input> <output> <profilePath> [otherProfilePaths...]')
   .description('Transcode a video')
   //.option('-i, --input <path>','Path to the input file.')
   //.option('-o, --output <path>','Path to the output file.')
   //.option('-p, --profile-paths <paths...>','Paths to the profiles.')
   .action(function(input, output, profilePath, otherProfilePaths) {
       
        console.log('input "%s"', input);
        console.log('output "%s"', output);
        //console.log('path "%s"', profilePath);
        
        let pl = new ProfileLoader();
        
        pl.push(profilePath);
        
        if (otherProfilePaths) {
            otherProfilePaths.forEach(function (path) {
                //console.log('path "%s"', path);
                pl.push(path);
            });
        }
        
        var profile = pl.getMerged();
        
        //profile.bin = {ffmpeg: 'bin/ffmpeg/ffmpeg'};
        profile.bin = {ffmpeg: 'ffmpeg'};
        profile.input = input;
        profile.output = output;
        
        var transcoder = new Transcoder();

        transcoder.setInput(input);
        transcoder.setOutput(output)
        transcoder.setProfile(profile);
        
        transcoder.transcode(/* callback */);
    });

program.parse(process.argv);