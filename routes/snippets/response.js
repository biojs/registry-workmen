module.change_code = 1; 
// THIS separation is done because it allows hotswapping

var snip = {};

snip._demoFill = function (res, item, pkg){
  // TODO: experimental way to send events to the main window
  if(pkg.events !== undefined) {
    //var head = ";if(parent !== undefined) { ";
    var head = "";
    var foot = ".on('all',function(name,data){";
    foot += 'var obj = {name: name, data: data};'; 
    //foot += 'obj = JSON.stringify(obj);'; 
    foot += 'if(typeof parent !== "undefined"){ parent.postMessage(obj, "*") }})';
    //foot += "};";
  
    item.inlineScript = item.inlineScript.replace(/\/\/instance=([.a-zA-Z0-9_]+)/, head + "$1" + foot);
 }
  res.render("single", {scripts: item.js, css: item.css, inlineScript: item.inlineScript, inlineBody: item.inlineBody});
};

module.exports = snip;
