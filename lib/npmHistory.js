var registry = require("npm-registry");
var q = require('bluebird');
var request = require('request');
var dateFormat = require('dateformat');

// crawls download statistics from npm
module.exports = function(pkg, npm){
  if(npm == undefined){
    npm = new registry();
  }

  return new q.Promise(function(resolve,reject){
    request.get('http://api.npmjs.org/downloads/range/2000-01-01:' + dateFormat(new Date(), "yyyy-mm-dd") +"/" + pkg.name, function (err, foo, body) {
      if(err) {
        reject(err)
      }

      var counts = 0;
      body = JSON.parse(body);

      for(var key in body.downloads){
        counts += body.downloads[key].downloads;
      }
      pkg.npmDownloads = counts;
      pkg.stats = body;
      resolve(pkg);
    });
  });
}


