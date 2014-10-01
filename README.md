registry-workmen
================

A rewrite of the BioJS registry.

Workflow
---------

1. Search for all packages with a special tag on npm ('biojs', bionode')
1b. Remove duplicate packages (uniq)
2. Send package event `single` to all listeners
2.1) Query npm
2.1.a) package.json
2.1.b) history stats
2.2). Query github
2.2.a) repo info
2.2.b).  Optional: Query github for snippets
3. Wait for the `done` events of all listeners for all packages
4. Store the result in a DB

Currently the db is cleaned on every run.

Future
-------

Avoid duplicate requests by using the existing DB at the beginning and cache.

Install
-------

```
npm install
```

Use
----

A working instance can be browsed at `workmen.biojs.net`.
If you want deploy access, ping @greenify - otherwise just send us a pull request here.

Available views
--------------

[`/all`](http://workmen.biojs.net/all)
  
  
  
[`/detail/biojs-sniper`](http://workmen.biojs.net/detail/biojs-sniper)

(see `server.js`)


Write an extension
-------------------

It consists of two steps

1) subscribe to package events `on("single, ..);
2) broadcast your status once you are done `.trigger("done",pkg);`

```
var ghClient = function(info){
  var self = this;

  // subscribe to package events
  this.info.on("single", this.query);

  // broadcast the done status once you finished downloading all resources
  this.query = function(pkg) { 
    self.info.trigger("done", pkg);
  }
```

Run
----

```
node server.js
```

(will be running on [Port 3000](http://localhost:3000))

Creds for github
------

Create your own oAuth token here

https://github.com/settings/applications

### a) via `creds.json`

`creds.json` (root folder)

```
{type:"oauth", token:"<token>"}
```

### b) via ENVs

define an enviroment variable

```
export GITHUB_TOKEN=<token>
```

[more info](https://www.npmjs.org/package/github)
