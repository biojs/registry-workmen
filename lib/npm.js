/**
 * Created by BioMedBridges on 19/09/2014.
 */
var registry = require("npm-registry");
var request = require('request');
var dateFormat = require('dateformat');

var npmInfos = {};

npmInfos.getNpmPackages = function(obj, callback){
    var npmPackages = [];
    for(var i in packages) {
        npm.packages.get(packages[i].name, function (err, package) {
            npmPackages.push(package);
            if (npmPackages.length == packages.length) {
                return npmPackages;
            }
        });
    }
};

npmInfos.getNpmDownloadHistory = function (){
    request.get('http://api.npmjs.org/downloads/range/2001-01-01:' + dateFormat(new Date(), "yyyy-mm-dd") +  '/biojs-io-graduates', function (err, foo, body) {
        return body;
    });
};

module.exports = npmInfos;