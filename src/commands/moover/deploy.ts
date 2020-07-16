import {core, flags, SfdxCommand} from '@salesforce/command';
import {AnyJson} from '@salesforce/ts-types';


// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mooverdxcli', 'org');

const axios_1 = require("axios");

export default class Org extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = [
  `$ sfdx moover:deploy -u FixesScratchOrg -v MainDevHub
  Command output... deploying from the dev hub, the control org, to the scratch org.
  Command output...
  `,
  `$ sfdx moover:deploy --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com 
  Command output... deploying from the dev hub, the control org, to the scratch org. Long param names.
  `,
  `$ sfdx moover:deploy -u test-utxac7gbati9@example.com -v jsmith@acme.com -d "UAT Sandbox Connection"
  Command output... deploying from the scratch org to the UAT sandbox, using the named connection record in the dev hub, control org.
  `,
  `$ sfdx moover:deploy --targetusername test-utxac7gbati9@example.com --targetdevhubusername jsmith@acme.com --source "UAT Sandbox Connection"
  Command output... deploying to the scratch org from the UAT sandbox, using the named connection record in the dev hub, control org. Long param names.
  `
  ];

  public static args = [{name: 'source'}];

  protected static flagsConfig = {
    // flag with a value (-d, --destination=VALUE)
    source: flags.string({char: 's', description: messages.getMessage('sourceFlagDescription')}),
    destination: flags.string({char: 'd', description: messages.getMessage('destinationFlagDescription')}),
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
    const sourceFlag = this.flags.source;
    const destinationFlag = this.flags.destination;
    const datasetFlag = this.flags.dataset;
    const planFlag = this.flags.plan;
    const isOrgSpecified = sourceFlag !== undefined || destinationFlag !== undefined;
    const trailSlashRegex = /\/$/;

    this.ux.log("Source connection flag: " + sourceFlag);
    this.ux.log("Destination connection flag: " + destinationFlag);
    this.ux.log("Data set flag: " + datasetFlag);
    this.ux.log("Deployment plan flag: " + planFlag);
    this.ux.log("Connections specified: " + isOrgSpecified);

    /*if (sourceFlag !== undefined && destinationFlag !== undefined) {
        throw new core.SfdxError(messages.getMessage('errorSourceAndTargetFlags', []));
    }*/
    if (datasetFlag === undefined && planFlag === undefined) {
        throw new core.SfdxError(messages.getMessage('errorNoDatasetAndPlanFlags', []));
    }
    if (datasetFlag !== undefined && planFlag !== undefined) {
        throw new core.SfdxError(messages.getMessage('errorDatasetAndPlanFlags', []));
    }
    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const hubConn = this.hubOrg.getConnection();
    const scratchConn = this.org.getConnection();
    const orgIdRegxp = /^([a-zA-Z0-9_-]){15,18}$/;
    let sourceParticipantConnection;
    let destinationParticipantConnection;
    let deployDataSet;
    let deployDeploymentPlan;
    let deploymentEntityId;
    let sourceRecordId = "";
    let sourceRefreshToken = "";
    let sourceAccessToken = "";
    let sourceOrgType = "";
    let sourceOrgId = "";
    let sourceUserId = "";
    let sourceInstanceUrl = "";
    let destinationRecordId = "";
    let destinationRefreshToken = "";
    let destinationAccessToken = "";
    let destinationOrgType = "";
    let destinationOrgId = "";
    let destinationUserId = "";
    let destinationInstanceUrl = "";
    let controlConnection;
    //Retrieve the control org connection
    this.ux.log(`Retrieving control org connection from the dev hub control org.`);
    const controlQuery = "Select Id, Name, PDRI__Instance_URL__c, PDRI__Org_Type__c, PDRI__OrganizationId__c, PDRI__User_Id__c, PDRI__Refresh_Token__c, PDRI__Access_Token__c" +
        " from PDRI__Connection__c where PDRI__Active__c = true AND PDRI__Local_Connection__c = true";
    this.ux.log("Running query: " + controlQuery);
    // Query the org
    const controlResult = await hubConn.query(controlQuery);
    this.ux.log("Control org query complete.");
    // The output and --json will automatically be handled for you.
    if (!controlResult.records || controlResult.records.length <= 0) {
        throw new core.SfdxError(messages.getMessage('errorNoControlOrgFound', []));
    }
    controlConnection = controlResult.records[0];
    this.ux.log(`Retrieved control org connection record.`);

    //Retrieve source or destination org if specified
    if (isOrgSpecified) {
        this.ux.log(`Retrieving source or destination connection.`);
        var query = `Select Id, Name, PDRI__Instance_URL__c, PDRI__Org_Type__c, PDRI__OrganizationId__c, PDRI__User_Id__c, PDRI__Refresh_Token__c, PDRI__Access_Token__c from PDRI__Connection__c where PDRI__Active__c = true AND `;
        
        if (sourceFlag !== undefined) {
            var orgQuery;
            var idToQuery = sourceFlag;
            const isId = orgIdRegxp.test(idToQuery);
            this.ux.log(`Is source org ID: !{isId}`);
            if (isId) {
                orgQuery = query + `Id = '` + idToQuery + `' order by lastmodifieddate desc limit 1`;
            }
            else {
                orgQuery = query + `Name = '` + idToQuery + `' order by lastmodifieddate desc limit 1`;
            }
            this.ux.log("Running source query: " + orgQuery);
            // Query the org
            const result = await hubConn.query(orgQuery);
            // The output and --json will automatically be handled for you.
            if (!result.records || result.records.length <= 0) {
                throw new core.SfdxError(messages.getMessage('errorNoConnectionFound', [idToQuery]));
            }
            
            // Organization always only returns one result
            sourceParticipantConnection = result.records[0];       
        }
        
        if (destinationFlag !== undefined) {
            var orgQuery;
            var idToQuery = destinationFlag;
            const isId = orgIdRegxp.test(idToQuery);
            this.ux.log(`Is destination org ID: !{isId}`);
            if (isId) {
                orgQuery = query + `Id = '` + idToQuery + `' order by lastmodifieddate desc limit 1`;
            }
            else {
                orgQuery = query + `Name = '` + idToQuery + `' order by lastmodifieddate desc limit 1`;
            }
            this.ux.log("Running destination query: " + orgQuery);
            // Query the org
            const result = await hubConn.query(orgQuery);
            // The output and --json will automatically be handled for you.
            if (!result.records || result.records.length <= 0) {
                throw new core.SfdxError(messages.getMessage('errorNoConnectionFound', [idToQuery]));
            }
            
            // Organization always only returns one result
            destinationParticipantConnection = result.records[0];
        }
        
        this.ux.log(`Retrieved participant org connection record.`);
        if (sourceFlag !== undefined) {
            sourceRecordId = `${sourceParticipantConnection.Id}`;
            sourceRefreshToken = `${sourceParticipantConnection.PDRI__Refresh_Token__c}`;
            sourceAccessToken = `${sourceParticipantConnection.PDRI__Access_Token__c}`;
            sourceOrgType = `${sourceParticipantConnection.PDRI__Org_Type__c}`;
            sourceOrgId = `${sourceParticipantConnection.PDRI__OrganizationId__c}`;
            sourceUserId = `${sourceParticipantConnection.PDRI__User_Id__c}`;
            sourceInstanceUrl = `${sourceParticipantConnection.PDRI__Instance_URL__c}`;
        } else {
            sourceRecordId = ``; //Does not exist for scratch org, no connection record
            //sourceRefreshToken = `${scratchConn.getConnectionOptions().refreshToken}`;
            sourceAccessToken = `${scratchConn.getConnectionOptions().accessToken}`;
            sourceOrgType = `Sandbox`;
            sourceOrgId = `${this.org.getOrgId()}`;
            sourceUserId = `${scratchConn.getConnectionOptions().userId}`;
            sourceInstanceUrl = `${scratchConn.getConnectionOptions().instanceUrl}`.replace(trailSlashRegex, "");

            this.ux.log("Source org type: " + sourceOrgType);
            this.ux.log("Source org ID: " + sourceOrgId);
            this.ux.log("Source user ID: " + sourceUserId);
            //this.ux.log("Destination access token: " + sourceAccessToken);
            this.ux.log("Source instance URL: " + sourceInstanceUrl);
        }
        
        if (destinationFlag !== undefined) {
            destinationRecordId = `${destinationParticipantConnection.Id}`;
            destinationRefreshToken = `${destinationParticipantConnection.PDRI__Refresh_Token__c}`;
            destinationAccessToken = `${destinationParticipantConnection.PDRI__Access_Token__c}`;
            destinationOrgType = `${destinationParticipantConnection.PDRI__Org_Type__c}`;
            destinationOrgId = `${destinationParticipantConnection.PDRI__OrganizationId__c}`;
            destinationUserId = `${destinationParticipantConnection.PDRI__User_Id__c}`;
            destinationInstanceUrl = `${destinationParticipantConnection.PDRI__Instance_URL__c}`;
        } else {
            destinationRecordId = ``; //Does not exist for scratch org, no connection record
            //destinationRefreshToken = `${scratchConn.getConnectionOptions().refreshToken}`;
            destinationAccessToken = `${scratchConn.getConnectionOptions().accessToken}`;
            destinationOrgType = `Sandbox`;
            destinationOrgId = `${this.org.getOrgId()}`;
            destinationUserId = `${scratchConn.getConnectionOptions().userId}`;
            destinationInstanceUrl = `${scratchConn.getConnectionOptions().instanceUrl}`.replace(trailSlashRegex, "");

            this.ux.log("Destination org type: " + destinationOrgType);
            this.ux.log("Destination org ID: " + destinationOrgId);
            this.ux.log("Destination user ID: " + destinationUserId);
            //this.ux.log("Destination access token: " + destinationAccessToken);
            this.ux.log("Destination instance URL: " + destinationInstanceUrl);
        }
    } else {
        //this.ux.log(`Auth code: ${scratchConn.getConnectionOptions().authCode}`);

        sourceRecordId = ``; //Since using dev hub org connection info from DX, does not exist. If a problem could use control org connection.
        //sourceRefreshToken = `${hubConn.getConnectionOptions().refreshToken}`;
        sourceAccessToken = `${hubConn.getConnectionOptions().accessToken}`;
        sourceOrgType = `Production`;
        sourceOrgId = `${this.hubOrg.getOrgId()}`;
        sourceUserId = `${hubConn.getConnectionOptions().userId}`;
        sourceInstanceUrl = `${hubConn.getConnectionOptions().instanceUrl}`.replace(trailSlashRegex, "");
        destinationRecordId = ``; //Does not exist for scratch org, no connection record
        destinationAccessToken = `${scratchConn.getConnectionOptions().accessToken}`;
        destinationOrgType = `Sandbox`;
        destinationOrgId = `${this.org.getOrgId()}`;
        destinationUserId = `${scratchConn.getConnectionOptions().userId}`;
        destinationInstanceUrl = `${scratchConn.getConnectionOptions().instanceUrl}`.replace(trailSlashRegex, "");
    }
    //Retrieve the data set or deployment plan to deploy
    this.ux.log(`Retrieving data set or deployment plan to deploy.`);
    if (datasetFlag !== undefined) {
        const isId = orgIdRegxp.test(datasetFlag);
        this.ux.log("Is org ID: " + isId);
        let queryData;
        if (isId) {
            queryData = `Select Id, Name from PDRI__DataSet__c where PDRI__Active__c = true AND Id = '` + datasetFlag + `' order by lastmodifieddate desc limit 1`;
        }
        else {
            queryData = `Select Id, Name from PDRI__DataSet__c where PDRI__Active__c = true AND Name = '` + datasetFlag + `' order by lastmodifieddate desc limit 1`;
        }
        this.ux.log("Running query: " + queryData);
        // Query the org
        const result = await hubConn.query(queryData);
        // The output and --json will automatically be handled for you.
        if (!result.records || result.records.length <= 0) {
            throw new core.SfdxError(messages.getMessage('errorNoDataSetFound', [datasetFlag]));
        }
        deployDataSet = result.records[0];
        deploymentEntityId = `${deployDataSet.Id}`;
        this.ux.log(`Retrieved deploy data set record.`);
    }
    else if (planFlag !== undefined) {
        const isId = orgIdRegxp.test(planFlag);
        let queryData;
        if (isId) {
            queryData = `Select Id, Name from PDRI__Deployment_Plan__c where Id = '` + planFlag + `' order by lastmodifieddate desc limit 1`;
        }
        else {
            queryData = `Select Id, Name from PDRI__Deployment_Plan__c where Name = '` + planFlag + `' order by lastmodifieddate desc limit 1`;
        }
        this.ux.log("Running query: " + queryData);
        // Query the org
        const result = await hubConn.query(queryData);
        // The output and --json will automatically be handled for you.
        if (!result.records || result.records.length <= 0) {
            throw new core.SfdxError(messages.getMessage('errorNoDeploymentPlanFound', [planFlag]));
        }
        deployDeploymentPlan = result.records[0];
        deploymentEntityId = `${deployDeploymentPlan.Id}`;
        this.ux.log(`Retrieved deploy deployment plan record.`);
    }
    //Insert the new deployment result record
    this.ux.log(`Inserting the new deployment result record in the dev hub control org.`);
    const insertResult = await hubConn.insert("PDRI__Deployment_Result__c", [{ "PDRI__Status__c": "Submitted", "PDRI__Source_Connection__c": `${sourceRecordId}`, "PDRI__Target_Connection__c": `${destinationRecordId}` }]);
    this.ux.log(`Inserting result success: ` + insertResult[0].success);
    if (!insertResult[0].success) {
        const insertError = insertResult[0].errors;
        throw new core.SfdxError(messages.getMessage('errorCreatingDeploymentResult', [insertError]));
    }
    //Construct the dpeloyment request and make the callout to submit it
    this.ux.log(`Constructing deployment request.`);
    const contextUserId = `${hubConn.getConnectionOptions().userId}`;
    const deploymentResultId = `${insertResult[0].id}`;
    const param = { 'deploymentResultId': `${deploymentResultId}`,
        'submitterUserId': `${contextUserId}`,
        'submitterUserEmail': 'no-reply@prodly.co',
        'submitterUserFullName': 'Prodly User',
        'packageNameSpace': 'PDRI__',
        'deploymentEntityIds': [{ 'deploymentEntityId': `${deploymentEntityId}` }],
        'sourceOrgConnection': { 'recordId': `${sourceRecordId}`,
            'refreshToken': `${sourceRefreshToken}`,
            'accessToken': `${sourceAccessToken}`,
            'orgType': `${sourceOrgType}`,
            'orgId': `${sourceOrgId}`,
            'userId': `${sourceUserId}`,
            'instanceUrl': `${sourceInstanceUrl}` },
        'targetOrgConnection': { 'recordId': `${destinationRecordId}`,
            'refreshToken': `${destinationRefreshToken}`,
            'accessToken': `${destinationAccessToken}`,
            'orgType': `${destinationOrgType}`,
            'orgId': `${destinationOrgId}`,
            'userId': `${destinationUserId}`,
            'instanceUrl': `${destinationInstanceUrl}` },
        'controlOrgConnection': { 'recordId': `${controlConnection.Id}`,
            'refreshToken': `${controlConnection.PDRI__Refresh_Token__c}`,
            'orgType': `${controlConnection.PDRI__Org_Type__c}`,
            'orgId': `${controlConnection.PDRI__OrganizationId__c}`,
            'userId': `${controlConnection.PDRI__User_Id__c}`,
            'instanceUrl': `${controlConnection.PDRI__Instance_URL__c}` } };
    this.ux.log("Invoking deployment request with the Prodly AppOps service");
    const data = JSON.stringify(param);
    //this.ux.log(`Data: ${data}`);

    let path;

    if (datasetFlag !== undefined) {
        path = '/dataset/deploy';
    } else if (planFlag !== undefined) {
        path = '/plan/deploy';
    } else {
        path = '/dataset/deploy';
    }

    this.ux.log(`Path: ${path}`);
    this.ux.log(`Host: deployer.prodly.co`);
    let axiosConfig = {
        headers: {
            'Content-Type': 'application/json',
        }
    };
    axios_1.default.post(`https://deployer.prodly.co${path}`, data, axiosConfig)
        .then((res) => {
        this.ux.log(`Response status: ${res.status}`);
        this.ux.log(JSON.stringify(res.data, null, '\t'));
    })
        .catch((err) => {
        this.ux.log(`Error invoking deployment: ${err}`);
    });
    const outputString = `Deployment launched with the result ID ${deploymentResultId}`;
    
    // Return an object to be displayed with --json
    return { resultId: `${deploymentResultId}`, outputString };
  }
}
