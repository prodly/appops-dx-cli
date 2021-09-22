import {core, flags, SfdxCommand} from '@salesforce/command';
import {AnyJson} from '@salesforce/ts-types';


// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('appopsdxcli', 'org');

//const axios_1 = require("axios");

export default class Org extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = [
  `$ sfdx appops:deploy -n scratchorg -u FixesScratchOrg -v MainDevHub
  Command output... deploying from the dev hub, the control org, to the scratch org, auto managed with provided name.
  Command output...
  `,
  `$ sfdx appops:deploy --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com 
  Command output... deploying from the dev hub, the control org, to the scratch org. Long param names.
  `,
  `$ sfdx appops:deploy -u test-utxac7gbati9@example.com -v jsmith@acme.com -d "UAT Sandbox Connection"
  Command output... deploying from the scratch org to the UAT sandbox, using the named connection record in the dev hub, control org.
  `,
  `$ sfdx appops:deploy --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com --source "UAT Sandbox Connection"
  Command output... deploying to the scratch org from the UAT sandbox, using the named connection record in the dev hub, control org. Long param names.
  `
  ];

  public static args = [{name: 'source'}];

  protected static flagsConfig = {
    // flag with a value (-d, --destination=VALUE)
    name: flags.string({char: 'n', description: messages.getMessage('deplomentNameFlagDescription')}),
    notes: flags.string({char: 'o', description: messages.getMessage('notesFlagDescription')}),
    source: flags.string({char: 's', description: messages.getMessage('sourceFlagDescription')}),
    destination: flags.string({char: 'd', description: messages.getMessage('destinationFlagDescription')}),
    dataset: flags.string({char: 't', description: messages.getMessage('dataSetFlagDescription')}),
    plan: flags.string({char: 'p', description: messages.getMessage('deploymentPlanFlagDescription')}),
    label: flags.string({char: 'b', description: messages.getMessage('instanceNameFlagDescription')}),
    deactivate: flags.boolean({char: 'e', description: messages.getMessage('deactivateFlagDescription')}),
    simulation: flags.boolean({char: 'l', description: messages.getMessage('simulationFlagDescription')}),
    filter: flags.string({char: 'q', description: messages.getMessage('queryFilterFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  //https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_customize_properties_static.htm
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    const deploymentNameFlag = this.flags.name;
    const deploymentNotesFlag = this.flags.notes;
    const sourceFlag = this.flags.source;
    const destinationFlag = this.flags.destination;
    const datasetFlag = this.flags.dataset;
    const planFlag = this.flags.plan;
    const labelFlag = this.flags.label;
    const isOrgSpecified = sourceFlag !== undefined || destinationFlag !== undefined;
    const deactivateFlag = this.flags.deactivate;
    const simulationFlag = this.flags.simulation;
    const queryFilterFlag = this.flags.filter;

    this.ux.log("Deployment name flag: " + deploymentNameFlag);
    this.ux.log("Deployment description flag: " + deploymentNotesFlag);
    this.ux.log("Source instance flag: " + sourceFlag);
    this.ux.log("Destination instance flag: " + destinationFlag);
    this.ux.log("Data set flag: " + datasetFlag);
    this.ux.log("Deployment plan flag: " + planFlag);
    this.ux.log("Instance name flag: " + labelFlag);
    //this.ux.log("Instances specified: " + isOrgSpecified);
    this.ux.log("Deactivate flag: " + deactivateFlag);
    this.ux.log("Simulation flag: " + simulationFlag);
    this.ux.log("Query filter flag: " + queryFilterFlag);

    if (datasetFlag === undefined && planFlag === undefined) {
        throw new core.SfdxError(messages.getMessage('errorNoDatasetAndPlanFlags', []));
    }
    if (datasetFlag !== undefined && planFlag !== undefined) {
        throw new core.SfdxError(messages.getMessage('errorDatasetAndPlanFlags', []));
    }

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const hubConn = this.hubOrg.getConnection();
    const orgIdRegxp = /^([a-zA-Z0-9_-]){15,18}$/;

    let sourceInstanceId;
    let destinationInstanceId;
    let dataSetId;
    let deploymentPlanId;

    /*this.ux.log(`refresh token: ${scratchConn.getConnectionOptions().refreshToken}`);
    this.ux.log(`access token: ${scratchConn.getConnectionOptions().accessToken}`);
    this.ux.log(`username: ${scratchConn.getConnectionOptions().username}`);
    this.ux.log(`user id: ${scratchConn.getConnectionOptions().userId}`);
    this.ux.log(`org id: ${scratchConn.getConnectionOptions().orgId}`);
    this.ux.log(`instance url: ${scratchConn.getConnectionOptions().instanceUrl}`);
    this.ux.log(`username: ${this.org.getUsername()}`);*/

    //Four posibilities:
    //1. Source and destination instance params are provided, deploy from source to destination instance
    //2. Source instance and dx org param are provided, deploy from source instance to dx org instance
    //3. Destination instance and dx org param are provided, deploy from dx org instance to destination instance
    //4. Only dx org param is provided, deploy from devhub/control org to the destination instance.
    //
    //Any auto managed instances, and its associated auto created connections, will only contain a short lived refresh token
    //This means that for any subsequent deployments the refresh token needs to be updated with the latest
    //Which can only happen if we have a provided target username parameter for the instance org
    //So only the source or destination instance can be an auto managed

    //Set source mamanaged instance
    if (sourceFlag !== undefined) {
        //Source and/or destination is a managed instance and the other is a DX managed org
        this.ux.log("Source managed instance parameter is specified: ", sourceFlag);
        //Source is a managed instance, use the managed instance ID
        sourceInstanceId = sourceFlag;

        /*The below logic can be uncommented if/when we want to support updating the refresh token for the source or destination connection
        //when both source and destination are passed in as instance params, but the targetusername matches on of them
        //
        //Check if a managed instance exist with the same instance ID
        var managedInstance = await this.getManagedInstanceByInstanceId( sourceInstanceId, hubConn );  
        this.ux.log("Retrieved managed instance: ", managedInstance);       
        if( managedInstance ) {
            //If exists, use that managed instance ID
            this.ux.log("Managed instance found with connection ID: " + managedInstance.connectionId);

            //Update the connection with the latest access token
            this.ux.log("Updating the connection with the latest access token");
            await this.updateConnection(managedInstance.connectionId, this.org, hubConn);
        }*/
    } else if (isOrgSpecified) {
        //Source is a DX managed org
        this.ux.log("Source managed instance parameter is not specified, finding or creating managed instance by org ID: ", this.org.getOrgId());

        //Check if a managed instance exist with the same org ID
        var managedInstance = await this.getManagedInstanceByOrgId( this.org.getOrgId(), hubConn );   
        this.ux.log("Retrieved managed instance: ", managedInstance);       
        if( managedInstance ) {
            //If exists, use that managed instance ID
            this.ux.log("Managed instance found, using it, with ID: " + managedInstance.id);
            sourceInstanceId = managedInstance.id;

            //Update the connection with the latest access token
            this.ux.log("Updating the connection with the latest access token");
            await this.updateConnection(managedInstance.connectionId, this.org, hubConn);
        } else { 
            this.ux.log("Managed instance for the org does not exist, managing instance.");     
            //If doesn't exist, query for an active connection to the org
            var connectionId = await this.getConnectionId( this.org.getOrgId(), hubConn );  
            this.ux.log("Retrieved connection ID: ", connectionId);
            if( !connectionId ) {
                //If a connection doesn't exist, create it, then use it to manage the new instance
                this.ux.log("Connection does not exist, creating.");
                connectionId = await this.createConnection(labelFlag, this.org, hubConn);
                this.ux.log("Created connection with record ID: ", connectionId);
            } else {
                //Update the connection with the latest access token
                this.ux.log("Updating the connection with the latest access token");
                await this.updateConnection(connectionId, this.org, hubConn);
            }    
            //Connection exists, use it to manage the new instance
            managedInstance = await this.manageInstance(this.org.getOrgId(), connectionId, hubConn);
            this.ux.log("New managed instance: ", managedInstance.id);     

            sourceInstanceId = managedInstance.id;
        }     
    } else {
        //Source is the dev hub/control org
        this.ux.log("Source and Destination not specified, setting hub as the source, org ID: ", hubConn.getAuthInfoFields().orgId);

        var managedInstance = await this.getManagedInstanceByOrgId( hubConn.getAuthInfoFields().orgId, hubConn );   
        this.ux.log("Retrieved managed instance ID for the control org: ", managedInstance.id); 

        if( !managedInstance ) {
            throw new core.SfdxError("No managed instance found for the devhub/control org."); 
        }

        sourceInstanceId = managedInstance.id;
    }

    if (destinationFlag !== undefined) {
        this.ux.log("Destination managed instance parameter is specified: ", sourceFlag);
        //Destination is a managed instance, use the managed instance ID
        destinationInstanceId = destinationFlag;
    } else {
        //Destination is a DX managed org
        this.ux.log("Destination managed instance parameter is not specified, finding or creating managed instance by org ID: ", this.org.getOrgId());

        //Check if a managed instance exist with the same org ID
        var managedInstance = await this.getManagedInstanceByOrgId( this.org.getOrgId(), hubConn );   
        this.ux.log("Retrieved managed instance: ", managedInstance);
        if( managedInstance ) {
            //If exists, use that managed instance ID
            this.ux.log("Managed instance found, using it, with ID: " + managedInstance.id);
            destinationInstanceId = managedInstance.id;

            //Update the connection with the latest access token
            this.ux.log("Updating the connection with the latest access token");
            await this.updateConnection(managedInstance.connectionId, this.org, hubConn);
        } else { 
            this.ux.log("Managed instance for the org does not exist, managing instance.");     
            //If doesn't exist, query for an active connection to the org
            var connectionId = await this.getConnectionId( this.org.getOrgId(), hubConn );  
            this.ux.log("Retrieved connection ID: ", connectionId);
            if( !connectionId ) {
                //If a connection doesn't exist, create it, then use it to manage the new instance
                this.ux.log("Connection does not exist, creating.");
                connectionId = await this.createConnection(labelFlag, this.org, hubConn);
                this.ux.log("Created connection with record ID: ", connectionId);
            } else {
                //Update the connection with the latest access token
                this.ux.log("Updating the connection with the latest access token");
                await this.updateConnection(connectionId, this.org, hubConn);
            }    
            //Connection exists, use it to manage the new instance
            managedInstance = await this.manageInstance(this.org.getOrgId(), connectionId, hubConn);
            this.ux.log("New managed instance ID: ", managedInstance.id);
            
            destinationInstanceId = managedInstance.id;
        }     
    }
    
    this.ux.log("Refreshing org session auth");
    try {
        await this.org.refreshAuth();
    } catch{  console.log("Target username not valid or not specified, refresh failed"); }

    //Retrieve the data set or deployment plan to deploy
    this.ux.log(`Retrieving data set or deployment plan to deploy.`);
    if (datasetFlag !== undefined) {
        dataSetId = await this.getDeploymentEntityId(datasetFlag, 'PDRI__DataSet__c', orgIdRegxp, hubConn);
    } else if (planFlag !== undefined) {
        deploymentPlanId = await this.getDeploymentEntityId(planFlag, 'PDRI__Deployment_Plan__c', orgIdRegxp, hubConn);
    }
    this.ux.log(`Launching deployment.`);
    let jobId = await this.deploy(deploymentNameFlag,
        deploymentNotesFlag,
        simulationFlag,
        deactivateFlag,
        queryFilterFlag,
        sourceInstanceId, 
        destinationInstanceId,
        dataSetId,
        deploymentPlanId, 
        hubConn);
    
    this.ux.log(`Deployment launched with job ID ${jobId}.`);    

    const outputString = `Deployment launched with the job ID ${jobId}`;
    
    // Return an object to be displayed with --json
    return { resultId: `${jobId}`, outputString };
  }

  async deploy(deploymentName,
    deploymentNotes,
    simulation,
    deactivateAllEvents,
    queryFilter,
    sourceInstanceId, 
    destinationInstanceId,
    dataSetId,
    deploymentPlanId, 
    hubConn) {
    this.ux.log(`Invoking deployment.`);

    let path = '/services/apexrest/PDRI/v1/instances/' + destinationInstanceId + '/deploy';
    
    let eventControlOptions = {
        deactivateAll : deactivateAllEvents === undefined ? false : true
    }

    let queryFilterOptions = {
        filter : queryFilter === undefined ? undefined : queryFilter
    }

    let dataDeploymentOptions = {
        dataSetId : dataSetId,
        deploymentPlanId : deploymentPlanId,
        simulation : simulation === undefined ? false : simulation,
        eventControlOptions : eventControlOptions,
        queryFilter : queryFilterOptions
    }
    
    let sourceOptions = {
        managedInstanceId : sourceInstanceId
    }

    let deployInstance = {
        deploymentName : deploymentName,
        deploymentNotes : deploymentNotes,
        data : [dataDeploymentOptions],
        metadata : {},
        source : sourceOptions
    };

    console.log("Sending deploy request path: " + path);
    console.log("Sending deploy request body: ");
    console.log(JSON.stringify(deployInstance));

    let request = {
        body : JSON.stringify(deployInstance),
        method : 'POST',
        url : path
    }

    return await hubConn.request(request, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        console.log("Deploy response: ", res);
        let jobsWrapper : Jobs = JSON.parse( res );
        console.log("parsed job wrapper");
        let jobId = jobsWrapper.jobs[0].id;
        console.log("Job id: ", jobId);
        return jobId;
    });
  }  

  async getDeploymentEntityId(dataEntityFlag,  
    dataEntityType, 
    orgIdRegxp,
    hubConn) {
    const isId = orgIdRegxp.test(dataEntityFlag);
    this.ux.log("Is org ID: " + isId);
    let queryData;
    if (isId && dataEntityType === 'PDRI__DataSet__c') {
        queryData = "Select Id, Name from " + dataEntityType + " where PDRI__Active__c = true AND Id = '" + dataEntityFlag + "' order by lastmodifieddate desc limit 1";
    } else if (isId && dataEntityType === 'PDRI__Deployment_Plan__c') {
        queryData = "Select Id, Name from " + dataEntityType + " where Id = '" + dataEntityFlag + "' order by lastmodifieddate desc limit 1";
    } else if( !isId && dataEntityType === 'PDRI__DataSet__c' ) {
        queryData = "Select Id, Name from " + dataEntityType + " where PDRI__Active__c = true AND Name = '" + dataEntityFlag + "' order by lastmodifieddate desc limit 1";
    } else if( !isId && dataEntityType === 'PDRI__Deployment_Plan__c' ) {
        queryData = "Select Id, Name from " + dataEntityType + " where Name = '" + dataEntityFlag + "' order by lastmodifieddate desc limit 1";
    }
    this.ux.log("Running query: " + queryData);
    // Query the org
    const result = await hubConn.query(queryData);
    // The output and --json will automatically be handled for you.
    if (!result.records || result.records.length <= 0) {
        if( dataEntityType = 'PDRI__DataSet__c' ) {
            throw new core.SfdxError(messages.getMessage('errorNoDataSetFound', [dataEntityFlag]));
        } else {
            throw new core.SfdxError(messages.getMessage('errorNoDeploymentPlanFound', [dataEntityFlag]));          
        }
    }
    return result.records[0].Id;
  }

  async getConnectionId(orgId, hubConn) {
    this.ux.log(`Retrieving the connection record ID for org ${orgId}.`);

    let query = "select Id from PDRI__Connection__c where PDRI__OrganizationId__c = '" + orgId + "'" +
        " AND PDRI__Active__c = true order by CreatedDate desc limit 1";
    this.ux.log("Running query: " + query);

    // Query the org
    const result = await hubConn.query(query);
    this.ux.log("Query result: " + result);
    if (!result.records || result.records.length <= 0) {
        return null;
    }

    this.ux.log("Connection record: " + result.records[0].Id);

    return result.records[0].Id;
  }

  async getManagedInstanceByOrgId(orgId, hubConn) {
    this.ux.log(`Retrieving the managed instance ID for org ${orgId}.`);

    let path = '/services/apexrest/PDRI/v1/instances';

    let managedInstance = undefined;
    
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

  /*async getManagedInstanceByInstanceId(instanceId, hubConn) {
    this.ux.log(`Retrieving the managed instance ID for connection ID ${connectionId}.`);

    let path = '/services/apexrest/PDRI/v1/instances';

    return await hubConn.request(`${hubConn.instanceUrl}${path}`, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        console.log("Get managed instance response: ", JSON.stringify(res));
        let managedInstances : ManagedInstances = JSON.parse( JSON.stringify(res) );
        managedInstances.instances.forEach( (instance) => {
            if( instance.id === instanceId ) {
                console.log("Found matching instance: ", instance);
                return instance;
            }
        });
    });
  }*/

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

    let connectionId = undefined;

    connectionId = await hubConn.create("PDRI__Connection__c", connection, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        console.log("Create connection response: ", JSON.stringify(res));
        connectionId = res.id;
    });

    console.log("Returning connection id: ", connectionId.id);
    return connectionId.id;
  }
  
  async updateConnection(connectionId, org, hubConn) {
    let connection = { Id : connectionId, 
        PDRI__Access_Token__c : org.getConnection().getConnectionOptions().accessToken };

    return await hubConn.update("PDRI__Connection__c", connection, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        console.log("Update connection response: ", JSON.stringify(res));
    });
  }   

  async manageInstance(orgId, connectionId, hubConn) {
    this.ux.log(`Managing instance for org ID ${orgId}.`);

    let path = '/services/apexrest/PDRI/v1/instances';

    let request = {
        body : '{"platformInstance" : {"platformInstanceId": "' + orgId + '", "connectionId" : "' + connectionId + '"}}',
        method : 'POST',
        url : path
    }

    let jobId = undefined;
    
    await hubConn.request(request, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        
        //console.log("Manage instance response: ", res);
        let jobsWrapper : Jobs = JSON.parse( res );
        jobId = jobsWrapper.jobs[0].id;
        console.log("Job id: ", jobId);
    });

    if (!jobId) { 
        throw new core.SfdxError("No job ID returned after submitting an instance to be managed."); 
    }

    this.ux.log(`Waiting for completion of the manage instance job ID ${jobId}.`);

    //Currently wait for no jobs to be returned, which mean the job completed, but bad way of doing this.
    let completedJob = null;
    for (let i = 0; i < 60; i++) {
        let job = await this.jobCompletion(jobId, hubConn);
        if( job ) {
            this.ux.log(`Job completed.`);
            completedJob = job;
            break;
        }
        await this.delay(500);
    }

    if( !completedJob ) {
        throw new core.SfdxError("Manage instance job did not complete within the allowed time.");
    }

    //await this.delay(2000);

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

        let jobsWrapper : Jobs = JSON.parse( res );
        let job = jobsWrapper.jobs[0];

        //console.log("Job: ", job);
        
        if( job.status == 'COMPLETED' ) {
            completedJob = job;
        } else {
            completedJob = undefined;
        }
    });

    return completedJob;
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


