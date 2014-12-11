module.exports.mongoify = function(key){
  return key.replace(/\./g, "\uff0E");
};

module.exports.unmongoify = function(key){
  return key.replace(/\uff0E/g, ".");
};
