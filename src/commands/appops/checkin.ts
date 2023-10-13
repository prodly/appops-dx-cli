import {flags, SfdxCommand} from '@salesforce/command';
import {Messages, SfError} from '@salesforce/core';
import {AnyJson} from '@salesforce/ts-types';


// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('appopsdxcli', 'org');

export default class Org extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = [
  `$ sfdx appops:checkin --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com 
  Save managed data to the branch associated with the managed instance identified by the target username. 
  The instance should be managed by the AppOps account associated with the provided DevHub control org.
  `,
  `$ sfdx appops:checkin -u test-utxac7gbati9@example.com
  Save managed data to the branch associated with the managed instance identified by the target username. 
  The instance should be managed by the AppOps account associated with the default DevHub control org.
  `,
  `$ sfdx appops:checkin -i f50616b6-57b1-4941-802f-ee0e2506f217
  Save managed data to the branch associated with the managed instance identified by the provided ID. 
  The instance should be managed by the AppOps account associated with the default DevHub control org.
  `
  ];

  public static args = [{name: 'source'}];

  protected static flagsConfig = {
    // flag with a value (-d, --destination=VALUE)
    instance: flags.string({char: 'i', description: messages.getMessage('instanceFlagDescription')}),
    comment: flags.string({char: 'c', description: messages.getMessage('commentFlagDescription')}),
    branch: flags.string({char: 'b', description: messages.getMessage('branchFlagDescription')}),
    dataset: flags.string({char: 't', description: messages.getMessage('dataSetFlagDescription')}),
    plan: flags.string({char: 'p', description: messages.getMessage('deploymentPlanFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    const instanceFlag = this.flags.instance;
    const commentFlag = this.flags.comment;
    const branchFlag = this.flags.branch;
    const datasetFlag = this.flags.dataset;
    const planFlag = this.flags.plan;

    this.ux.log("Instance flag: " + instanceFlag);
    this.ux.log("Comment flag: " + commentFlag);
    this.ux.log("Branch flag: " + branchFlag);
    this.ux.log("Data set flag: " + datasetFlag);
    this.ux.log("Deployment plan flag: " + planFlag);

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const hubConn = this.hubOrg.getConnection();
    const orgIdRegxp = /^([a-zA-Z0-9]){15,18}$/;

    let mangedInstanceId = null;
    let dataSetId;
    let deploymentPlanId;

    //Retrieve the data set or deployment plan to deploy
    this.ux.log(`Retrieving data set or deployment plan to deploy.`);
    if (datasetFlag !== undefined) {
        dataSetId = await this.getDeploymentEntityId(datasetFlag, 'PDRI__DataSet__c', orgIdRegxp, hubConn);
    } else if (planFlag !== undefined) {
        deploymentPlanId = await this.getDeploymentEntityId(planFlag, 'PDRI__Deployment_Plan__c', orgIdRegxp, hubConn);
    }

    this.ux.log("Data set ID: " + dataSetId);
    this.ux.log("Deployment plan ID: " + deploymentPlanId);

    //Check if instance is provided
    if (instanceFlag !== undefined) {
        //Use provided managed instance
        this.ux.log(`Managed instance ID provided, using instance with id ${instanceFlag}`);
        mangedInstanceId = instanceFlag;
    } else {
        //Retrieve the managed instance associated with target org
        //DevHub control org is never used as the default
        var managedInstance = await this.getManagedInstance( this.org.getOrgId(), hubConn );
        if( managedInstance === null ) {
            throw new SfError(messages.getMessage('errorManagedInstaceNotFound')); 
        }
        this.ux.log(`Managed instance ID retrieved, using instance with id ${managedInstance.id}`);
        mangedInstanceId =  managedInstance.id;

        this.ux.log("Refreshing org session auth");
        try {
            await this.org.refreshAuth();
        } catch{  console.log("Target username not valid or not specified, refresh failed"); }

        //Update the connection with the latest access token
        this.ux.log("Updating the connection with the latest access token");
        await this.updateConnection(managedInstance.connectionId, this.org, hubConn);
    }

    //Perform the checkin
    await this.checkinInstance(mangedInstanceId, commentFlag, branchFlag, dataSetId, deploymentPlanId, hubConn);

    return '{}';
  }

  async updateConnection(connectionId, org, hubConn) {
    let connection = { Id : connectionId, 
        PDRI__Access_Token__c : org.getConnection().getConnectionOptions().accessToken };

    return await hubConn.update("PDRI__Connection__c", connection, function(err, res) {
        if (err) { 
            throw new SfError(err); 
        }
        console.log("Update connection response: ", JSON.stringify(res));
    });
  }  

  async checkinInstance(mangedInstanceId, comment, branchFlag, dataSetId, deploymentPlanId, hubConn) {
    this.ux.log(`Performing checkin for managed instance with id ${mangedInstanceId}.`);

    let path = '/services/apexrest/PDRI/v1/instances/' + mangedInstanceId + '/checkin';

    let checkinOptions = {
        commitMessage : comment
    };

    let checkinInstance = {
        datasetId : dataSetId,
        deploymentPlanId : deploymentPlanId,
        branchName : branchFlag,
        options : checkinOptions
    };

    console.log("Sending checkin request body: ");
    console.log(JSON.stringify(checkinInstance));

    let request = {
        body : JSON.stringify(checkinInstance),
        method : 'POST',
        //headers : { 'vcs-access-token': vcsToken },
        url : path
    }

    await hubConn.request(request, function(err, res) {
        if (err) { 
            throw new SfError(err); 
        }
        console.log("Checkin instance response: ", JSON.stringify(res));
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
            throw new SfError(messages.getMessage('errorNoDataSetFound', [dataEntityFlag]));
        } else {
            throw new SfError(messages.getMessage('errorNoDeploymentPlanFound', [dataEntityFlag]));          
        }
    }
    return result.records[0].Id;
  }

  async getManagedInstance(orgId, hubConn) {
    this.ux.log(`Retrieving the managed instance ID for org ${orgId}.`);

    let path = '/services/apexrest/PDRI/v1/instances';


    try {
        const instancesRes = await hubConn.request(
          `${hubConn.instanceUrl}${path}`
        );
        const managedInstances: ManagedInstances = JSON.parse(
          JSON.stringify(instancesRes)
        );
        const managedInstance = managedInstances.instances.find(
          (instance) => instance.platformInstanceId === orgId
        );
        return managedInstance;
      } catch (err) {
        throw new SfError(err);
      }
  }
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


