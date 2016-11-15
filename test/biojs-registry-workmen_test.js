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

var winston = require("winston");

    var github = require('../lib/github.js');
    var workflow = require('../workflow.js')(winston);

    // set github API token
    process.env.GITHUB_TOKEN = "ABC"; process.env.TEST_MODE = true;

    describe('workmen module', function() {
      describe('#queryAll()', function() {
        it('should mock receive biojs-vis-msa for the biojs tag and save it in the db', function(done) {

          var opts = {};
          opts.keys = ["biojs"];
          opts.registryURL = "https://registry.npmjs.eu";

          var requestURL = "/-/_view/byKeyword?startkey=%5B%22biojs%22%5D&endkey=%5B%22biojs%22%2C%7B%7D%5D&group_level=3&descending=false&stale=update_after";

          var scope = nock(opts.registryURL)
            .get(requestURL)
            .replyWithFile(200, __dirname + '/npm.all.response')
            .get('/biojs-vis-msa')
            .replyWithFile(200, __dirname + '/npm.msa.response');

          var flow = new workflow(opts);

          flow.start().then(function(pkgs) {
            var msa = pkgs[0];
            assert.equal(msa.name, "biojs-vis-msa");
            flow.stop();
            done();
          });
        });
      });
    });

    describe('github module', function() {
      describe('#queryAll()', function() {
        it('should return an array of github infos', function(done) {
          var pkg = {
            name: "biojs-vis-msa",
            repository: {
              type: "git",
              url: "git://github.com/greenify/biojs-vis-msa"
            }
          };
          var scope = nock('https://api.github.com')
            .filteringPath(/access_token=[^&]*/g, 'access_token=XXX')
            .get('/repos/greenify/biojs-vis-msa?access_token=XXX')
            .replyWithFile(200, __dirname + '/github.msa.response')
            .get('/repos/greenify/biojs-vis-msa')
            .replyWithFile(200, __dirname + '/github.msa.response')
            .get('/repos/greenify/biojs-vis-msa/contributors')
            .replyWithFile(200, __dirname + '/github.msa.contributors.response');
          var ghClient = new github(pkg, {
            log: winston
          });
          ghClient.then(function(msa) {
            var parsedGithubMSA = JSON.parse(msa.github, 'utf8');
            // assert.equal(msa.github.id, 20128188);
            assert.equal(parsedGithubMSA.id, 20128188);
            // assert.equal(msa.github.commits, 597);
            done();
          });
        });
      });
    });
