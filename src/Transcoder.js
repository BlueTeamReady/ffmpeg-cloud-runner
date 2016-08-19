var Handlebars = require('handlebars');
var util = require('util');

// Constructor
function Transcoder() {
    this.bin = 'ffmpeg';
    
    this.input = '';
    this.output = '';
    
    this.profile = {};
}

Transcoder.prototype.setInput = function(val) {
    this.input = val;
}

Transcoder.prototype.setOutput = function(val) {
    this.output = val;
}

Transcoder.prototype.setProfile = function(val) {
    this.profile = val;
}

Transcoder.prototype.transcode = function(callback) {
    //TODO: validate input, output, and profile
    
    this.profile.bin = {ffmpeg: this.bin};
    this.profile.input = this.input;
    this.profile.output = this.output;
    
    console.log("Profile: " + util.inspect(this.profile,false,null));
    
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
        renderedCommandSegments.push(rendered(this.profile));
    }.bind(this));
    
    console.log(renderedCommandSegments);
    
    var command = renderedCommandSegments.join(' ');
    console.log("command: %s", command);
    
    var spawn = require('child_process').spawn;
    var bin = renderedCommandSegments.shift();
    
    //console.log(renderedCommandSegments);
    
    // Prepare rendered command segments for passing to spawn
    var spawnCommandSegments = [];
    
    renderedCommandSegments.forEach(function (item) {
        spawnCommandSegments.push.apply(spawnCommandSegments,item.split(' '));
    });

    console.log(spawnCommandSegments);

    var child = spawn(bin, spawnCommandSegments, {
        shell: "bin/bash"
    });
    
    child.stdout.on('data', (data) => {
        console.log(`${data}`);
    });
    
    child.stderr.on('data', (data) => {
        console.log(`${data}`);
    });
    
    child.on('close', function (code) {
        //console.log(`child process exited with code ${code}`);
        
        var data = {
            resultPath: this.output,
            command: command,
            exitCode: code
        };
        var err = null
        
        if (code !== 0) {
            err = {message: "Shell command exited with a non-zero exit code."};
        }
        
        if (typeof callback == 'function') { 
            callback(err,data)
        }
    }.bind(this) );
    
}

// export the class
module.exports = Transcoder;