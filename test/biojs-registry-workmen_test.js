/*
 * biojs-registry-workmen
 * https://github.com/biojs/biojs-registry-workmen
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the Apache 2 license.
 */

'use strict';

var chai = require('chai');
chai.expect();
chai.should();
var assert = chai.assert;
var nock = require("nock");
var sinon = require('sinon');


var github = require('../lib/github.js');
var workmen = require('../lib/workmen.js');

describe('workmen module', function(){
  describe('#queryAll()', function(){
    it('should mock receive biojs-vis-msa for the biojs tag and save it in the db', function(done){
      var scope = nock('http://registry.nodejitsu.com')
        .get('/-/_view/byKeyword?startkey=%5B%22biojs%22%5D&endkey=%5B%22biojs%22%2C%7B%7D%5D&group_level=3&descending=false&stale=update_after')
        .replyWithFile(200, __dirname + '/npm.all.response')
        .get('/biojs-vis-msa')
        .replyWithFile(200, __dirname + '/npm.msa.response');
      new workmen(function(pkgs){
        var msa = pkgs['biojs-vis-msa'];
        assert.equal(msa.name, "biojs-vis-msa");
        done();
      });
    });
  });
});

describe('github module', function(){
  describe('#queryAll()', function(){
    it('should return an array of github infos', function(done){
      var pkg = {repository: {type:"git", url:"git://github.com/greenify/biojs-vis-msa"}};
      var scope = nock('https://api.github.com')
        .filteringPath(/access_token=[^&]*/g, 'access_token=XXX')
        .get('/repos/greenify/biojs-vis-msa?access_token=XXX')
        .replyWithFile(200, __dirname + '/msa.response');
      var customDone = function(name, msa){
        assert.equal(msa.github.id, 20128188);
        done();
      };
      var ghClient = new github(customDone);
      ghClient.query(pkg); 
    });
  });
});
