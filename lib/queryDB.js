module.change_code = 1; // this allows hotswapping of code (ignored in production)

var query;
module.exports = query =  {}

query.demo = function(req,res) {
  var name = req.params.name;
  var currentSnip = req.params.snip;
  var hasExtension = currentSnip.indexOf(".") >= 0;

  global.db().find({name: name}).exec(function (err, pkg) {
    if(pkg.length == 0 || pkg[0].latest.sniper == undefined){
      res.send({error: "no snips"});
      return;
    }
    // if there is a file extension - we probably want to load it from github
    if(hasExtension){
      console.log(pkg);
      if(pkg.latest.repository != undefined && pkg.latest.repository.github != undefined){
        serveGithubFile(path, currentSnip, res)
      }else{
        console.log("nr github repository found");
      }
    }else{
      loadSnippet({pkg: pkg[0], currentSnip: currentSnip,res:res}, function (item){
        snipResponse._demoFill(res,item,pkg[0]);
      });
    }
  });
}
