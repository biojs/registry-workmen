module.change_code = 1; 
// THIS separation is done because it allows hotswapping

var snip = {};

snip._demoFill = function (res, item, pkg){
  var instance = pkg.latest.sniper.instance;
  // TODO: experimental way to send events to the main window
  if(instance !== undefined) {
    item.inlineScript += ";if(parent !== undefined) { ";
    item.inlineScript += instance + ".onAll(function(name,data){";
    item.inlineScript += 'var obj = {name: name, data: data};'; 
    item.inlineScript += 'parent.postMessage(obj, "*") })';
    item.inlineScript += "};";
  }
  res.render("single", {scripts: item.js, css: item.css, inlineScript: item.inlineScript, inlineBody: item.inlineBody});
};

module.exports = snip;
