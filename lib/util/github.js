var Gutil;
module.exports = Gutil = {};

// return githubusercontent url to the root folder
Gutil.rawURL = function(ghub){
  return "https://raw.githubusercontent.com/" + ghub.full_name + "/" + ghub.default_branch + "/";
};

// parse the node git url string
Gutil.parsePackage = function(pkg){
      // TODO: ugly way to split the git url string
      var url = pkg.repository.url.split("/");
      var name = {user: url[url.length - 2], repo: url[url.length - 1]};
      return name;
};
