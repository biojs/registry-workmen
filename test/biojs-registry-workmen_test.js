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


var scope = require('nock')('https://api.github.com')
.filteringPath(/access_token=[^&]*/g, 'access_token=XXX')
.get('/repos/greenify/biojs-vis-msa?access_token=XXX')
.replyWithFile(200, __dirname + '/msa.response');


var github = require('../lib/github.js');

describe('github module', function(){
  describe('#queryAll()', function(){
    it('should return an array of github infos', function(done){
      var pkgs = [{repository: {type:"git", url:"git://github.com/greenify/biojs-vis-msa"}}];
      github.queryAll(pkgs, function(){
       assert.equal(pkgs[0].github.id, 20128188);
       done();
      });
    });
  });
});
