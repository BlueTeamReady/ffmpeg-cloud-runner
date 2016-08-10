var fs = require('fs');
var merge = require('deepmerge');

// Constructor
function ProfileLoader() {
    this.profilePaths = [];
}

// class methods
ProfileLoader.prototype.getMerged = function() {
    //var profiles  = [];
    var profile = {};
    
    this.profilePaths.forEach(function (path) {
        //console.log(fs.realpathSync(path));
        var contents = fs.readFileSync(path, 'utf8');
        
        if (contents !== '') {
            var obj = JSON.parse(contents);
            //profiles.push(obj);
            profile = merge(profile,obj);
        }
    });
    
    return profile;
};

ProfileLoader.prototype.push = function(path) {
    this.profilePaths.push(path);
}

// export the class
module.exports = ProfileLoader;