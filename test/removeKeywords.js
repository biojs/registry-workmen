/*
 * biojs-registry-workmen
 * https://github.com/biojs/biojs-registry-workmen
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the Apache 2 license.
 */


var chai = require('chai');
var assert = chai.assert;
var equal = assert.deepEqual;

var removeKeywords = require('../lib/util/postProcessor.js');
var toDelKeys = ["biojs", "bionode"];

// wrapper around the package based keyword removal
function remKeywords(keywords, keys) {
  var pkg = {
    keywords: keywords
  };
  var opts = {
    keys: toDelKeys
  };
  removeKeywords(pkg, opts);
  return pkg.keywords;
}

describe('utils module', function() {
  describe('#removeKeywords()', function() {
    it('should remove keywords from an array', function() {
      var keywords = ["biojs", "foo", "bar"];
      equal(remKeywords(keywords, toDelKeys), ["foo", "bar"]);
      keywords = ["foo", "bar", "biojs"];
      equal(remKeywords(keywords, toDelKeys), ["foo", "bar"], "order shouldn't be a matter");
      keywords = ["foo", "bionode", "bar"];
      equal(remKeywords(keywords, toDelKeys), ["foo", "bar"], "remove other keywords");
    });
    it('should remove multiple keywords from an array', function() {
      var keywords = ["biojs", "foo", "bar", "bionode"];
      equal(remKeywords(keywords, toDelKeys), ["foo", "bar"]);
    });
  });
});
