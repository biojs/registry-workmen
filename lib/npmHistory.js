var registry = require("npm-registry");
var q = require('bluebird');
var request = require('request');
var dateFormat = require('dateformat');

// crawls download statistics from npm
module.exports = function(pkg, npm) {
  if (npm === undefined) {
    npm = new registry();
  }

  var sevenDays = 3600 * 1000 * 24 * 7;
  var now = Date.now();

  return new q.Promise(function(resolve, reject) {
    request.get('http://api.npmjs.org/downloads/range/2000-01-01:' + dateFormat(new Date(), "yyyy-mm-dd") + "/" + pkg.name, function(err, foo, body) {
      if (err) {
        console.log("error in parsing the history body of" + pkg.name);
        reject(err);
        return;
      }

      var totalCounts = 0;
      var lastWeek = 0;
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.log("error in parsing the history body of" + pkg.name);
        console.log(body);
        reject(e);
        return;
      }

      for (var key in body.downloads) {
        var dayInMS = Date.parse(key);
        var val = body.downloads[key].downloads;
        totalCounts += val;
        if ((now - dayInMS) <= sevenDays) {
          lastWeek += val;
        }
      }
      pkg.npmDownloads = totalCounts;
      pkg.npmDownloadsLastWeek = lastWeek;
      pkg.stats = body;
      resolve(pkg);
    });
  });
};
