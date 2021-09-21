import {core, flags, SfdxCommand} from '@salesforce/command';
import {AnyJson} from '@salesforce/ts-types';


// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('appopsdxcli', 'org');

export default class Org extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = [
  `$ sfdx appops:manage -l -p
  List and print all of the managed instances for the AppOps account associated with the default DevHub control org.
  `,
  `$ sfdx appops:manage -m --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com 
  Manage the org associated with the target username under the AppOps account associated with the provided DevHub control org.
  `,
  `$ sfdx appops:manage -m -u test-utxac7gbati9@example.com -n dev7sbx
  Manage and version the org associated with the target username under the AppOps account associated with the default DevHub control org.
  `/*,
  `$ sfdx appops:manage -x -u test-utxac7gbati9@example.com
  Unmanage the instance associated with the target username under the AppOps account associated with the default DevHub control org.
  `,
  `$ sfdx appops:manage -x -i 6a4412b7-74d6-47e0-a048-e7d39e8c304f
  Unmanage the instance with the provided ID under the AppOps account associated with the default DevHub control org.
  `*/
  ];

  public static args = [{name: 'source'}];

  protected static flagsConfig = {
    // flag with a value (-d, --destination=VALUE)
    list: flags.boolean({char: 'l', description: messages.getMessage('listFlagDescription')}),
    print: flags.boolean({char: 'p', description: messages.getMessage('printFlagDescription')}),
    manage: flags.boolean({char: 'm', description: messages.getMessage('manageFlagDescription')}),
    unmanage: flags.boolean({char: 'x', description: messages.getMessage('unmanageFlagDescription')}),
    instance: flags.string({char: 'i', description: messages.getMessage('instanceFlagDescription')}),
    label: flags.string({char: 'b', description: messages.getMessage('instanceNameFlagDescription')}),
    version: flags.boolean({char: 's', description: messages.getMessage('versionFlagDescription')}),
    comment: flags.string({char: 'c', description: messages.getMessage('commentFlagDescription')}),
    connection: flags.string({char: 'n', description: messages.getMessage('connectionFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    const listFlag = this.flags.list;
    const printFlag = this.flags.print;
    const manageFlag = this.flags.manage;
    const unmanageFlag = this.flags.unmanage;
    const instanceFlag = this.flags.instance;
    const labelFlag = this.flags.label;
    const versionFlag = this.flags.version;
    const commentFlag = this.flags.comment;
    const connectionFlag = this.flags.connection;

    this.ux.log("List flag: " + listFlag);
    this.ux.log("Print flag: " + printFlag);
    this.ux.log("Manage flag: " + manageFlag);
    this.ux.log("Instance flag: " + instanceFlag);
    this.ux.log("Instance name flag: " + labelFlag);
    this.ux.log("Unmanage flag: " + unmanageFlag);
    this.ux.log("Version flag: " + versionFlag);
    this.ux.log("Comment flag: " + commentFlag);
    this.ux.log("Connection flag: " + connectionFlag);

    if (listFlag === undefined && manageFlag === undefined && unmanageFlag === undefined) {
        throw new core.SfdxError(messages.getMessage('errorNoManageFlags', []));
    }

    if (listFlag !== undefined && manageFlag !== undefined) {
        throw new core.SfdxError(messages.getMessage('errorMultipleManageFlags', []));
    }

    if (listFlag === undefined && printFlag !== undefined) {
        throw new core.SfdxError(messages.getMessage('errorPrintFlagNoListFlag', []));
    }

    if (manageFlag === undefined && versionFlag !== undefined) {
        throw new core.SfdxError(messages.getMessage('errorVersionFlagNoManageFlag', []));
    }

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const hubConn = this.hubOrg.getConnection();
    const orgIdRegxp = /^([a-zA-Z0-9_-]){15,18}$/;


    //List manages instances command
    if (listFlag !== undefined) {
        this.ux.log(`Listing managed instances.`);
        let managedInstances = await this.getManagedInstances(hubConn);

        const connectionIds = [];

        managedInstances.instances.forEach( (instance) => {
            connectionIds.push( instance.connectionId );
        });

        let connections = await this.queryConnections(connectionIds, hubConn);

        managedInstances.instances.forEach( (instance) => {
            let connection = connections.get( instance.connectionId );
            let connectionName = connection ? connection.Name : '';
            let instanceUrl = connection ? connection.PDRI__Instance_URL__c : '';

            instance.instanceName = connectionName;
            instance.instanceUrl = instanceUrl;
        });

        if( printFlag ) {
            this.ux.log(`Printing managed instances.`);
            this.ux.log(``);

            managedInstances.instances.forEach( (instance) => {
                let connection = connections.get( instance.connectionId );
                let connectionName = connection ? connection.Name : '';
                let instanceUrl = connection ? connection.PDRI__Instance_URL__c : '';

                this.ux.log(`Managed Instance`);
                this.ux.log(`Instance ID: ${instance.id}`);
                this.ux.log(`Instance Name: ${connectionName}`);
                this.ux.log(`Control Instance: ${instance.controlInstance}`);
                this.ux.log(`Salesforce Org ID: ${instance.platformInstanceId}`);
                this.ux.log(`Connection Record ID: ${instance.connectionId}`);
                this.ux.log(`Instance Type ${instance.instanceType}`);
                this.ux.log(`Instance URL ${instanceUrl}`);
                this.ux.log(``);
            });
        }

        return managedInstances;
    } else if (manageFlag !== undefined) {
        this.ux.log(`Managing instance.`);

        this.ux.log("Refreshing org session auth");
        try {
            await this.org.refreshAuth();
        } catch{  console.log("Target username not valid or not specified, refresh failed"); }

        let connectionId = null;

        if( connectionFlag ) {
            this.ux.log("Connection to use for the managed instances provided: " + connectionFlag);
            let connection = await this.queryConnection(connectionFlag, orgIdRegxp, hubConn);
            connectionId = connection.Id;
        } else {
            this.ux.log("Creating connection.");

            connectionId = await this.createConnection(labelFlag, this.org, hubConn);
            this.ux.log("Created connection with record ID: ", connectionId);
        }

        let managedInstance = await this.manageInstance(this.org.getOrgId(), connectionId, versionFlag, commentFlag, hubConn);

        if( managedInstance === null ) {
            throw new core.SfdxError(messages.getMessage('errorManagedInstaceNotFound')); 
        }

        this.ux.log("New managed instance: ", managedInstance.id);

        return managedInstance.id;
    } else if (unmanageFlag !== undefined) {
        this.ux.log(`Unmanaging instance.`);

        let mangedInstanceId = null;

        if (instanceFlag !== undefined) {
            //Use provided managed instance
            this.ux.log(`Managed instance ID provided, using instance with id ${instanceFlag}`);
            mangedInstanceId = instanceFlag;
        } else if( connectionFlag ) {
            this.ux.log("Connection to use for the managed instances provided: " + connectionFlag);
            let connection = await this.queryConnection(connectionFlag, orgIdRegxp, hubConn);
            let orgId = connection.PDRI__OrganizationId__c;

            //Retrieve the managed instance associated with target org
            //DevHub control org is never used as the default
            var managedInstance = await this.getManagedInstance( orgId, hubConn );
            if( managedInstance === null ) {
                throw new core.SfdxError(messages.getMessage('errorManagedInstaceNotFound')); 
            }
            mangedInstanceId = managedInstance.id;
        } else {
            throw new core.SfdxError(messages.getMessage('errorManagedInstaceNotProvided')); 
        }

        await this.unmanageInstance(mangedInstanceId, hubConn);
    }
    
  }

  async queryConnections(connectionIds, hubConn) {
    this.ux.log("Querying connections");

    if( connectionIds.length == 0 ) {
        return;
    }

    var query = `Select Id, Name, PDRI__Instance_URL__c from PDRI__Connection__c where ID IN ( `;

    connectionIds.forEach( (connectionId) => {
        query += ( `'` + connectionId + `',` );
    });

    query = query.substring(0, query.length - 1);

    query += `)`;

    this.ux.log("Running source query: " + query);

    // Query the org
    const result = await hubConn.query(query);

    // The output and --json will automatically be handled for you.
    if (!result.records || result.records.length <= 0) {
        throw new core.SfdxError(messages.getMessage('errorNoConnectionFound', [connectionIds]));
    }

    let connections = new Map();

    result.records.forEach( (connection) => {
        connections.set(connection.Id, connection);
    });

    return connections;
  }

  async queryConnection(connectionNameOrId, orgIdRegxp, hubConn) {
    this.ux.log("Querying connection: " + connectionNameOrId);

    var query = `Select Id, Name, PDRI__OrganizationId__c from PDRI__Connection__c where PDRI__Active__c = true AND `;

    const isId = orgIdRegxp.test(connectionNameOrId);
    var orgQuery;
    if (isId) {
        orgQuery = query + `Id = '` + connectionNameOrId + `' order by lastmodifieddate desc limit 1`;
    } else {
        orgQuery = query + `Name = '` + connectionNameOrId + `' order by lastmodifieddate desc limit 1`;
    }
    this.ux.log("Running source query: " + orgQuery);
    // Query the org
    const result = await hubConn.query(orgQuery);
    // The output and --json will automatically be handled for you.
    if (!result.records || result.records.length <= 0) {
        throw new core.SfdxError(messages.getMessage('errorNoConnectionFound', [connectionNameOrId]));
    }

    return result.records[0];
  }

  async getManagedInstance(orgId, hubConn) {
    this.ux.log(`Retrieving the managed instance ID for org ${orgId}.`);

    let path = '/services/apexrest/PDRI/v1/instances';
    let managedInstance = null;

    await hubConn.request(`${hubConn.instanceUrl}${path}`, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        console.log("Get managed instance response: ", JSON.stringify(res));
        let managedInstances : ManagedInstances = JSON.parse( JSON.stringify(res) );
        managedInstances.instances.forEach( (instance) => {
            if( instance.platformInstanceId === orgId ) {
                console.log("Found matching instance: ", instance);
                managedInstance = instance;
            }
        });
    });

    return managedInstance;
  }

  async unmanageInstance(instanceId, hubConn) {
    this.ux.log(`Unmanaging instance with ID ${instanceId}.`); 

    let path = '/services/apexrest/PDRI/v1/instances/' + instanceId;
    
    let request = {
        method : 'DELETE',
        url : path
    }

    await hubConn.request(request, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
    });

    return;
  }

  async manageInstance(orgId, connectionId, versionFlag, comment, hubConn) {
    this.ux.log(`Managing instance for org ID ${orgId}.`); 

    let jobId = null;
    let path = '/services/apexrest/PDRI/v1/instances';
    let platformInstanceBody = '"platformInstance" : {"platformInstanceId": "' + orgId + '", "connectionId" : "' + connectionId + '"}'
    let versioningBody = '';

    if( versionFlag ) {
        this.ux.log(`Versioning is enabled.`);
        versioningBody = ', "options": {"checkin": true, "checkout": true, "commitMessage": "' + comment + '"}';

        if( comment ) {
            versioningBody += ', "commitMessage": "' + comment + '"';
        }
    }

    let body = '{' + platformInstanceBody + versioningBody + '}';

    let request = {
        body : body,
        method : 'POST',
        //headers : { 'vcs-access-token': vcsToken },
        url : path
    }

    console.log("Body: ", body);

    await hubConn.request(request, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        
        //console.log("Manage instance response: ", res);
        let jobsWrapper : Jobs = JSON.parse( res );
        console.log("parsed job wrapper");
        jobId = jobsWrapper.jobs[0].id;
        console.log("Job id: ", jobId);
    });

    if (!jobId) { 
        throw new core.SfdxError("No job ID returned after submitting an instance to be managed."); 
    }

    this.ux.log(`Waiting for completion of the manage instance job ID ${jobId}.`);

    //Currently wait for no jobs to be returned, which mean the job completed, but bad way of doing this.
    let completedJob = null;
    for (let i = 0; i < 1800; i++) {
        let job = await this.jobCompletion(jobId, hubConn);
        if( job ) {
            this.ux.log(`Job completed.`);
            completedJob = job;
            break;
        }
        await this.delay(1000);
    }

    if( !completedJob ) {
        throw new core.SfdxError("Manage instance job did not complete within the allowed time.");
    }

    let managedInstance : ManagedInstance = JSON.parse( completedJob.resultData );

    return managedInstance;
  }

  async jobCompletion(jobId, hubConn) {
    let path = '/services/apexrest/PDRI/v1/jobs/' + jobId;
    let completedJob = undefined;

    await hubConn.request(`${hubConn.instanceUrl}${path}`, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        //console.log("Job completion response: ", res);
        let jobsWrapper : Jobs = JSON.parse( res );
        let job = jobsWrapper.jobs[0];
        
        if( job.status == 'COMPLETED' ) {
            completedJob = job;
        }
    });

    return completedJob;
  }

  async createConnection(name, org, hubConn) {
    const trailSlashRegex = /\/$/;

    let connection = { PDRI__Active__c : true, 
        Name : name ? name : org.getUsername() + ' ' + org.getOrgId(), 
        PDRI__OrganizationId__c : org.getOrgId(), 
        PDRI__Access_Token__c : org.getConnection().getConnectionOptions().accessToken,
        PDRI__Org_Type__c : 'Sandbox',
        PDRI__Instance_URL__c : org.getConnection().getConnectionOptions().instanceUrl.replace(trailSlashRegex, ""),
        PDRI__User_Id__c : org.getConnection().getConnectionOptions().userId,
        PDRI__Username__c : org.getUsername()
    };

    let retrievedConnection = await hubConn.create("PDRI__Connection__c", connection, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        console.log("Create connection response: ", JSON.stringify(res));
    });

    console.log("Returning connection id: ", retrievedConnection.id);
    return retrievedConnection.id;
  }

  async getManagedInstances(hubConn) {
    this.ux.log(`Retrieving all managed instances.`);

    let path = '/services/apexrest/PDRI/v1/instances';
    let managedInstances = null;

    await hubConn.request(`${hubConn.instanceUrl}${path}`, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        console.log("Get managed instance response: ", JSON.stringify(res));
        let allManagedInstances : ManagedInstances = JSON.parse( JSON.stringify(res) );
        managedInstances = allManagedInstances;

    });

    return managedInstances;
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface Jobs {
    jobs : Job[];
}

interface Job {
    currentStep : string;
    metadata : string;
    isBlocking : boolean;
    resultData : string;
    started : string;
    finished : string;
    operationType : string;
    id : string;
    error : string;
    managedInstanceId : string;
    userId : string;
    status : string;
}

interface ManagedInstances {
    instances : ManagedInstance[];
}

interface ManagedInstance {
    platformInstanceId : string;
    instanceType : string;
    instanceUrl : string;
    id : string;
    controlInstance : boolean;
    connectionId : string;
}


