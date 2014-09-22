registry-workmen
================

A rewrite of the BioJS registry.

Workflow
---------

1. Search for all packages with a special tag on npm ('biojs', bionode')
1b. Remove duplicate packages (uniq)
2. Query npm
2a) package.json
2b) history stats
3. Query github
3a) repo info
3b) repo stats (downloads)
4.  Optional: Query github for snippets
5. Store the result in a DB


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
If you want deploy access, ping @greenify otherwise just send us a pull request here.

Available views
--------------

[`/all`](http://workmen.biojs.net/all)
  
  
  
[`/detail/biojs-sniper`](http://workmen.biojs.net/detail/biojs-sniper)

(see `server.js`)

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
