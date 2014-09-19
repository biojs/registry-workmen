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

var biojs-registry-workmen = require('../lib/biojs-registry-workmen.js');

describe('biojs-registry-workmen module', function(){
  describe('#awesome()', function(){
    it('should return a hello', function(){
      biojs-registry-workmen.awesome('livia').should.equal("hello livia");
    });
  });
});
