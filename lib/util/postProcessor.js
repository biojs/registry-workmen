function postProcessor(pkg, opts) {

  var keywords = opts.keys || [];

  // check for invalid requests
  if (keywords.length === 0) {
    return pkg;
  }

  keywords = keywords.map(function(val) {
    return val.toLowerCase();
  });

  pkg.keywords = removeKeywords(pkg.keywords, keywords);
  // TODO: add other post processing 
  return pkg;
}

var removeKeywords = function(keys, toRemove) {
  var key = 0;
  while (key < keys.length) {
    if (toRemove.indexOf(keys[key].toLowerCase()) >= 0) {
      keys.splice(key, 1);
    } else {
      key++;
    }
  }
  return keys;
};

module.exports = postProcessor;
