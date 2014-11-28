var queries = {};

queries.all = function all(req, res){
  // attributes to keep in the short version
  var props = ['created', 'description', 'dependencies', 'devDependencies',
    'dist-tags', 'releases', 'version', 'versions', 'license', 'name', 'modified',
    'npmDownloads', 'keywords', 'sniper', 'homepage','author', 'repository'];

    db.db().find().exec(function (err, pkgs) {
      // &short=1 gives only the abstract of every pkg
      if(req.query.short !== undefined){
        var pkgsSum = pkgs.map(function(el){
          return _.pick(el,props);
        });
        res.jsonp(pkgsSum);
      }else{
        res.jsonp(pkgs);
      };
    });
};

queries.detail = function detail(req, res){
  var name = req.params.name;
  db.db().find({name: name}).exec(function (err, pkgs) {
    if( pkgs.length == 0){
      res.send({error: "does not exist"});
      return;
    }
    var pkg = pkgs[0];
    res.jsonp(pkg);
  });
};

module.exports = queries;
