appopsdxcli
===========

The CLI for Prodly AppOps DX.

[![Version](https://img.shields.io/npm/v/appopsdxcli.svg)](https://npmjs.org/package/appopsdxcli)
[![CircleCI](https://circleci.com/gh/prodly/appopsdxcli/tree/master.svg?style=shield)](https://circleci.com/gh/prodly/appopsdxcli/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/prodly/appopsdxcli?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/appopsdxcli/branch/master)
[![Codecov](https://codecov.io/gh/prodly/appopsdxcli/branch/master/graph/badge.svg)](https://codecov.io/gh/prodly/appopsdxcli)
[![Greenkeeper](https://badges.greenkeeper.io/prodly/appopsdxcli.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/prodly/appopsdxcli/badge.svg)](https://snyk.io/test/github/prodly/appopsdxcli)
[![Downloads/week](https://img.shields.io/npm/dw/appopsdxcli.svg)](https://npmjs.org/package/appopsdxcli)
[![License](https://img.shields.io/npm/l/appopsdxcli.svg)](https://github.com/prodly/appopsdxcli/blob/master/package.json)

<!-- toc -->
* [Debugging your plugin](#debugging-your-plugin)
<!-- tocstop -->
<!-- install -->
```sh-session
$ sfdx plugins:install appopsdxcli
```
<!-- usage -->
```sh-session
$ npm install -g appopsdxcli
$ sfdx COMMAND
running command...
$ sfdx (--version)
appopsdxcli/1.5.17 darwin-x64 node-v18.12.0
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx appops:checkin [-i <string>] [-c <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-appopscheckin--i-string--c-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx appops:checkout [-i <string>] [-e] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-appopscheckout--i-string--e--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx appops:deploy -n <string> [-o <string>] [-s <string>] [-d <string>] [-t <string>] [-p <string>] [-b <string>] [-e] [-l] [-q <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-appopsdeploy--n-string--o-string--s-string--d-string--t-string--p-string--b-string--e--l--q-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx appops:manage [-l] [-p] [-m] [-x] [-i <string>] [-b <string>] [-s] [-c <string>] [-n <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-appopsmanage--l--p--m--x--i-string--b-string--s--c-string--n-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx appops:checkin [-i <string>] [-c <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Launches an AppOps relational data deployment.

```
USAGE
  $ sfdx appops:checkin [-i <string>] [-c <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json]
    [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -c, --comment=<value>                                                             comment for the command versioning
                                                                                    commit
  -i, --instance=<value>                                                            managed instance ID on which to
                                                                                    perform the action
  -u, --targetusername=<value>                                                      username or alias for the target
                                                                                    org; overrides default target org
  -v, --targetdevhubusername=<value>                                                username or alias for the dev hub
                                                                                    org; overrides default dev hub org
  --apiversion=<value>                                                              override the api version used for
                                                                                    api requests made by this command
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Launches an AppOps relational data deployment.

EXAMPLES
  $ sfdx appops:checkin --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com 
    Save managed data to the branch associated with the managed instance identified by the target username. 
    The instance should be managed by the AppOps account associated with the provided DevHub control org.
  

  $ sfdx appops:checkin -u test-utxac7gbati9@example.com
    Save managed data to the branch associated with the managed instance identified by the target username. 
    The instance should be managed by the AppOps account associated with the default DevHub control org.
  

  $ sfdx appops:checkin -i f50616b6-57b1-4941-802f-ee0e2506f217
    Save managed data to the branch associated with the managed instance identified by the provided ID. 
    The instance should be managed by the AppOps account associated with the default DevHub control org.
```

_See code: [src/commands/appops/checkin.ts](https://github.com/prodly/appopsdxcli/blob/v1.5.17/src/commands/appops/checkin.ts)_

## `sfdx appops:checkout [-i <string>] [-e] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Launches an AppOps relational data deployment.

```
USAGE
  $ sfdx appops:checkout [-i <string>] [-e] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -e, --deactivate                                                                  deactivate all events for the
                                                                                    deployment
  -i, --instance=<value>                                                            managed instance ID on which to
                                                                                    perform the action
  -u, --targetusername=<value>                                                      username or alias for the target
                                                                                    org; overrides default target org
  -v, --targetdevhubusername=<value>                                                username or alias for the dev hub
                                                                                    org; overrides default dev hub org
  --apiversion=<value>                                                              override the api version used for
                                                                                    api requests made by this command
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Launches an AppOps relational data deployment.

EXAMPLES
  $ sfdx appops:checkout --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com 
      Deploy managed data to the managed instance identified by the target username from the associated branch.. 
      The instance should be managed by the AppOps account associated with the provided DevHub control org.
    

  $ sfdx appops:checkout -u test-utxac7gbati9@example.com
      Deploy managed data to the managed instance org identified by the target username from the associated branch.
      The instance should be managed by the AppOps account associated with the default DevHub control org.
    

  $ sfdx appops:checkout -i f50616b6-57b1-4941-802f-ee0e2506f217
      Deploy managed data to the managed instance org from the associated branch.
      The instance should be managed by the AppOps account associated with the default DevHub control org.
```

_See code: [src/commands/appops/checkout.ts](https://github.com/prodly/appopsdxcli/blob/v1.5.17/src/commands/appops/checkout.ts)_

## `sfdx appops:deploy -n <string> [-o <string>] [-s <string>] [-d <string>] [-t <string>] [-p <string>] [-b <string>] [-e] [-l] [-q <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Launches an AppOps relational data deployment.

```
USAGE
  $ sfdx appops:deploy -n <string> [-o <string>] [-s <string>] [-d <string>] [-t <string>] [-p <string>] [-b
    <string>] [-e] [-l] [-q <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -b, --label=<value>                                                               connection and managed instance name
  -d, --destination=<value>                                                         destination managed instance ID
  -e, --deactivate                                                                  deactivate all events for the
                                                                                    deployment
  -l, --simulation                                                                  perform a data simulation
  -n, --name=<value>                                                                (required) name for the deployment
  -o, --notes=<value>                                                               notes for the deployment
  -p, --plan=<value>                                                                name or record ID of the deployment
                                                                                    plan to deploy
  -q, --filter=<value>                                                              query filter override for a data set
                                                                                    deployment
  -s, --source=<value>                                                              source managed instance ID
  -t, --dataset=<value>                                                             name or record ID of the data set to
                                                                                    deploy
  -u, --targetusername=<value>                                                      username or alias for the target
                                                                                    org; overrides default target org
  -v, --targetdevhubusername=<value>                                                username or alias for the dev hub
                                                                                    org; overrides default dev hub org
  --apiversion=<value>                                                              override the api version used for
                                                                                    api requests made by this command
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Launches an AppOps relational data deployment.

EXAMPLES
  $ sfdx appops:deploy -n scratchorg -u FixesScratchOrg -v MainDevHub
    Command output... deploying from the dev hub, the control org, to the scratch org, auto managed with provided name.
    Command output...
  

  $ sfdx appops:deploy --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com 
    Command output... deploying from the dev hub, the control org, to the scratch org. Long param names.
  

  $ sfdx appops:deploy -u test-utxac7gbati9@example.com -v jsmith@acme.com -d "UAT Sandbox Connection"
    Command output... deploying from the scratch org to the UAT sandbox, using the named connection record in the dev hub, control org.
  

  $ sfdx appops:deploy --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com --source "UAT Sandbox Connection"
    Command output... deploying to the scratch org from the UAT sandbox, using the named connection record in the dev hub, control org. Long param names.
```

_See code: [src/commands/appops/deploy.ts](https://github.com/prodly/appopsdxcli/blob/v1.5.17/src/commands/appops/deploy.ts)_

## `sfdx appops:manage [-l] [-p] [-m] [-x] [-i <string>] [-b <string>] [-s] [-c <string>] [-n <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Launches an AppOps relational data deployment.

```
USAGE
  $ sfdx appops:manage [-l] [-p] [-m] [-x] [-i <string>] [-b <string>] [-s] [-c <string>] [-n <string>] [-v
    <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -b, --label=<value>                                                               connection and managed instance name
  -c, --comment=<value>                                                             comment for the command versioning
                                                                                    commit
  -i, --instance=<value>                                                            managed instance ID on which to
                                                                                    perform the action
  -l, --list                                                                        list all managed instances
  -m, --manage                                                                      manage a new instance
  -n, --connection=<value>                                                          connection to use for the managed
                                                                                    instance
  -p, --print                                                                       print the managed instances in a
                                                                                    standard format in addition to
                                                                                    returning structured data
  -s, --version                                                                     version the new managed instance,
                                                                                    branch created and data deployed to
                                                                                    the org
  -u, --targetusername=<value>                                                      username or alias for the target
                                                                                    org; overrides default target org
  -v, --targetdevhubusername=<value>                                                username or alias for the dev hub
                                                                                    org; overrides default dev hub org
  -x, --unmanage                                                                    unmanage the specified instance
  --apiversion=<value>                                                              override the api version used for
                                                                                    api requests made by this command
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Launches an AppOps relational data deployment.

EXAMPLES
  $ sfdx appops:manage -l -p
    List and print all of the managed instances for the AppOps account associated with the default DevHub control org.
  

  $ sfdx appops:manage -m --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com 
    Manage the org associated with the target username under the AppOps account associated with the provided DevHub control org.
  

  $ sfdx appops:manage -m -u test-utxac7gbati9@example.com -n dev7sbx
    Manage and version the org associated with the target username under the AppOps account associated with the default DevHub control org.
```

_See code: [src/commands/appops/manage.ts](https://github.com/prodly/appopsdxcli/blob/v1.5.17/src/commands/appops/manage.ts)_
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
