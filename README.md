mooverdxcli
===========

The CLI for Moover DX.

[![Version](https://img.shields.io/npm/v/mooverdxcli.svg)](https://npmjs.org/package/mooverdxcli)
[![CircleCI](https://circleci.com/gh/prodly/mooverdxcli/tree/master.svg?style=shield)](https://circleci.com/gh/prodly/mooverdxcli/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/prodly/mooverdxcli?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/mooverdxcli/branch/master)
[![Codecov](https://codecov.io/gh/prodly/mooverdxcli/branch/master/graph/badge.svg)](https://codecov.io/gh/prodly/mooverdxcli)
[![Greenkeeper](https://badges.greenkeeper.io/prodly/mooverdxcli.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/prodly/mooverdxcli/badge.svg)](https://snyk.io/test/github/prodly/mooverdxcli)
[![Downloads/week](https://img.shields.io/npm/dw/mooverdxcli.svg)](https://npmjs.org/package/mooverdxcli)
[![License](https://img.shields.io/npm/l/mooverdxcli.svg)](https://github.com/prodly/mooverdxcli/blob/master/package.json)

<!-- toc -->
* [Debugging your plugin](#debugging-your-plugin)
<!-- tocstop -->
<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g mooverdxcli
$ mooverdxcli COMMAND
running command...
$ mooverdxcli (-v|--version|version)
mooverdxcli/0.0.1 darwin-x64 node-v8.9.4
$ mooverdxcli --help [COMMAND]
USAGE
  $ mooverdxcli COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`mooverdxcli moover:deploy [SOURCE]`](#mooverdxcli-mooverdeploy-source)

## `mooverdxcli moover:deploy [SOURCE]`

Launches a Moover relational data deployment for a scratch org.

```
USAGE
  $ mooverdxcli moover:deploy [SOURCE]

OPTIONS
  -d, --destination=destination                    destination connection name or record id
  -p, --plan=plan                                  deployment plan to deploy name or record id
  -s, --source=source                              source connection name or record id
  -t, --dataset=dataset                            data set to deploy name or record id
  -u, --targetusername=targetusername              username or alias for the target org; overrides default target org
  -v, --targetdevhubusername=targetdevhubusername  username or alias for the dev hub org; overrides default dev hub org
  --apiversion=apiversion                          override the api version used for api requests made by this command
  --json                                           format output as json
  --loglevel=(trace|debug|info|warn|error|fatal)   logging level for this command invocation

EXAMPLES
  $ sfdx moover:deploy -u FixesScratchOrg -v MainDevHub
     Command output... deploying from the dev hub, the control org, to the scratch org.
     Command output...
  
  $ sfdx moover:deploy --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com 
     Command output... deploying from the dev hub, the control org, to the scratch org. Long param names.
  
  $ sfdx moover:deploy -u test-utxac7gbati9@example.com -v jsmith@acme.com -d "UAT Sandbox Connection"
     Command output... deploying from the scratch org to the UAT sandbox, using the named connection record in the dev 
  hub, control org.
  
  $ sfdx moover:deploy --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com --source 
  "UAT Sandbox Connection"
     Command output... deploying to the scratch org from the UAT sandbox, using the named connection record in the dev 
  hub, control org. Long param names.
```

_See code: [src/commands/moover/deploy.ts](https://github.com/prodly/mooverdxcli/blob/v0.0.1/src/commands/moover/deploy.ts)_
<!-- commandsstop -->
<!-- debugging-your-plugin -->
# Debugging your plugin
We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `hello:org` command: 
1. Start the inspector
  
If you linked your plugin to the sfdx cli, call your command with the `dev-suspend` switch: 
```sh-session
$ sfdx hello:org -u myOrg@example.com --dev-suspend
```
  
Alternatively, to call your command using the `bin/run` script, set the `NODE_OPTIONS` environment variable to `--inspect-brk` when starting the debugger:
```sh-session
$ NODE_OPTIONS=--inspect-brk bin/run hello:org -u myOrg@example.com
```

2. Set some breakpoints in your command code
3. Click on the Debug icon in the Activity Bar on the side of VS Code to open up the Debug view.
4. In the upper left hand corner of VS Code, verify that the "Attach to Remote" launch configuration has been chosen.
5. Hit the green play button to the left of the "Attach to Remote" launch configuration window. The debugger should now be suspended on the first line of the program. 
6. Hit the green play button at the top middle of VS Code (this play button will be to the right of the play button that you clicked in step #5).
<br><img src=".images/vscodeScreenshot.png" width="480" height="278"><br>
Congrats, you are debugging!
