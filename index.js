#!/usr/bin/env node

'use strict';

//var fs = require('fs');
const Handlebars = require('handlebars');
const program = require('commander');
const ProfileLoader = require('./src/ProfileLoader');
const util = require('util');

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
        
        profile.bin = {ffmpeg: 'bin/ffmpeg/ffmpeg'};
        profile.input = input;
        profile.output = output;
        
        //console.log('%j', profile);
        console.log(util.inspect(profile,false,null));
        
        var commandTemplateSegments = [
            "{{bin.ffmpeg}}",
            "-i {{input}}",
            "{{#if video.scale}}-vf scale={{video.scale.w}}:{{video.scale.h}}{{/if}}",
            "{{#if video.codec}}-c:v {{video.codec}}{{/if}}",
            "{{#if video.bitrate.isVariable}}-b{{#if video.bitrate.target}}:v {{video.bitrate.target}}{{/if}}{{/if}}",
            "{{#if audio.codec}}-c:a {{audio.codec}}{{/if}}",
            "{{output}}"
        ];
        
        var compiledTemplateSegments = [];
        var renderedCommandSegments = [];
        
        commandTemplateSegments.forEach(function(seg) {
            var rendered = Handlebars.compile(seg);
            
            compiledTemplateSegments.push(rendered);
            renderedCommandSegments.push(rendered(profile));
        });
        
        var command = renderedCommandSegments.join(' ');
        
        if (false) {
            var exec = require('child_process').exec;
    
            exec(command, function(error, stdout, stderr) {
                console.log(stdout);
            });
        
        } else {
            var spawn = require('child_process').spawn;
            var bin = renderedCommandSegments.shift();
            
            console.log("command: %s", bin);
            console.log(renderedCommandSegments);
            
            renderedCommandSegments = [
                '-i','samples/anni001.mpg',
                '-vf','scale=640:320',
                '-c:v','libvpx',
                '-b:v','1M',
                '-c:a','libvorbis',
                'samples/out.webm'
            ];
            
            var child = spawn(bin, renderedCommandSegments, {
                cwd: __dirname,
                shell: "bin/bash"
            });
            
            child.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });
            
            child.stderr.on('data', (data) => {
                console.log(`stderr: ${data}`);
            });
            
            child.on('close', (code) => {
                console.log(`child process exited with code ${code}`);
            });
        }
    });

program.parse(process.argv);