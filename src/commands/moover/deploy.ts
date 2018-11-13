import {core, flags, SfdxCommand} from '@salesforce/command';
//import {Http, Headers, HTTP_PROVIDERS} from 'angular2/http';

// Initialize Messages with the current plugin directory
core.Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core.Messages.loadMessages('mooverdxcli', 'org');

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

  public async run(): Promise<core.AnyJson> {
    // The type we are querying for
    interface OrgConnection {
      Id: string;
      Name: string;
      PDRI__Instance_URL__c: string;
      PDRI__Org_Type__c: string;
      PDRI__OrganizationId__c: string;
      PDRI__User_Id__c: string;
      PDRI__Refresh_Token__c: string;
    }

    interface DataSet {
      Id: string;
      Name: string;
    }

    interface DeploymentPlan {
      Id: string;
      Name: string;
    }
    
    const sourceFlag = this.flags.source;
    const destinationFlag = this.flags.destination;
    const datasetFlag = this.flags.dataset;
    const planFlag = this.flags.plan;

    const isOrgSpecified = sourceFlag !== undefined || destinationFlag !== undefined;

    this.ux.log("Source connection flag: " + sourceFlag);
    this.ux.log("Destination connection flag: " + destinationFlag);
    this.ux.log("Data set flag: " + datasetFlag);
    this.ux.log("Deployment plan flag: " + planFlag);
    this.ux.log("Connections specified: " + isOrgSpecified);

    if( sourceFlag !== undefined && destinationFlag !== undefined ) {
      throw new core.SfdxError(messages.getMessage('errorSourceAndTargetFlags', []));
    }

    if( datasetFlag === undefined && planFlag === undefined ) {
      throw new core.SfdxError(messages.getMessage('errorNoDatasetAndPlanFlags', []));
    }

    if( datasetFlag !== undefined && planFlag !== undefined ) {
      throw new core.SfdxError(messages.getMessage('errorDatasetAndPlanFlags', []));
    }

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const hubConn = this.hubOrg.getConnection();
    const scratchConn = this.org.getConnection();

    const orgIdRegxp = /^([a-zA-Z0-9_-]){15,18}$/;

    let participantConnection;
    let deployDataSet;
    let deployDeploymentPlan;

    let sourceRecordId = "";
    let sourceRefreshToken = "";
    let sourceOrgType = "";
    let sourceOrgId = "";
    let sourceUserId = "";
    let sourceInstanceUrl = "";

    let destinationRecordId = "";
    let destinationRefreshToken = "";
    let destinationOrgType = "";
    let destinationOrgId = "";
    let destinationUserId = "";
    let destinationInstanceUrl = "";

    //Retrieve the control org connection
    this.ux.log(`Retrieving control org connection from the dev hub control org.`);

    const controlQuery = "Select Id, Name, PDRI__Instance_URL__c, PDRI__Org_Type__c, PDRI__OrganizationId__c, PDRI__User_Id__c, PDRI__Refresh_Token__c" +
      " from PDRI__Connection__c where PDRI__Active__c = true AND PDRI__Local_Connection__c = true";

    this.ux.log("Running query: " + controlQuery);

    // Query the org
    const controlResult = await hubConn.query<OrgConnection>(controlQuery);

    this.ux.log("Control org query complete.");

    // The output and --json will automatically be handled for you.
    if (!controlResult.records || controlResult.records.length <= 0) {
      throw new core.SfdxError(messages.getMessage('errorNoControlOrgFound', []));
    }

    const controlConnection = controlResult.records[0];

    this.ux.log(`Retrieved control org connection record.`);    

    //Retrieve source or destination org if specified
    if( isOrgSpecified ) {
      this.ux.log(`Retrieving source or destination connection.`);

      var query = `Select Id, Name, PDRI__Instance_URL__c, PDRI__Org_Type__c, PDRI__OrganizationId__c, PDRI__User_Id__c, PDRI__Refresh_Token__c from PDRI__Connection__c where PDRI__Active__c = true AND `;
      var idToQuery;

      if( sourceFlag !== undefined ) {
        idToQuery = sourceFlag;
      } else if( destinationFlag !== undefined ) {
        idToQuery = destinationFlag;
      }

      const isId = orgIdRegxp.test(idToQuery);

      this.ux.log(`Is org ID: !{isId}`);

      if( isId ) {
        query += `Id = '` + idToQuery + `' order by lastmodifieddate desc limit 1`;
      } else {
        query += `Name = '` + idToQuery + `' order by lastmodifieddate desc limit 1`;
      }

      this.ux.log("Running query: " + query);

      // Query the org
      const result = await hubConn.query<OrgConnection>(query);

      // The output and --json will automatically be handled for you.
      if (!result.records || result.records.length <= 0) {
        throw new core.SfdxError(messages.getMessage('errorNoConnectionFound', [idToQuery]));
      }

      // Organization always only returns one result
      participantConnection = result.records[0];

      this.ux.log(`Retrieved participant org connection record.`);

      if( sourceFlag !== undefined ) {
        sourceRecordId = `${participantConnection.Id}`;
        sourceRefreshToken = `${participantConnection.PDRI__Refresh_Token__c}`;
        sourceOrgType = `${participantConnection.PDRI__Org_Type__c}`;
        sourceOrgId = `${participantConnection.PDRI__OrganizationId__c}`;
        sourceUserId = `${participantConnection.PDRI__User_Id__c}`;
        sourceInstanceUrl = `${participantConnection.PDRI__Refresh_Token__c}`;
  
        destinationRecordId = ``;  //Does not exist for scratch org, no connection record
        destinationRefreshToken = `${scratchConn.getAuthInfo().getFields().refreshToken}`;
        destinationOrgType = `Sandbox`;
        destinationOrgId = `${this.org.getOrgId()}`;
        destinationUserId = `${scratchConn.getAuthInfo().getFields().userId}`;
        destinationInstanceUrl = `${scratchConn.getAuthInfo().getFields().instanceUrl}`;
      } else if( destinationFlag !== undefined ) {
        sourceRecordId = ``;  //Does not exist for scratch org, no connection record
        sourceRefreshToken = `${scratchConn.getAuthInfo().getFields().refreshToken}`;
        sourceOrgType = `Sandbox`;
        sourceOrgId = `${this.org.getOrgId()}`;
        sourceUserId = `${scratchConn.getAuthInfo().getFields().userId}`;
        sourceInstanceUrl = `${scratchConn.getAuthInfo().getFields().instanceUrl}`;

        destinationRecordId = `${participantConnection.Id}`;
        destinationRefreshToken = `${participantConnection.PDRI__Refresh_Token__c}`;
        destinationOrgType = `${participantConnection.PDRI__Org_Type__c}`;
        destinationOrgId = `${participantConnection.PDRI__OrganizationId__c}`;
        destinationUserId = `${participantConnection.PDRI__User_Id__c}`;
        destinationInstanceUrl = `${participantConnection.PDRI__Refresh_Token__c}`;
      }
    } else {
      sourceRecordId = ``; //Since using dev hub org connection info from DX, does not exist. If a problem could use control org connection.
      sourceRefreshToken = `${hubConn.getAuthInfo().getFields().refreshToken}`;
      sourceOrgType = `Production`;
      sourceOrgId = `${this.hubOrg.getOrgId()}`;
      sourceUserId = `${hubConn.getAuthInfo().getFields().userId}`;
      sourceInstanceUrl = `${hubConn.getAuthInfo().getFields().instanceUrl}`;

      destinationRecordId = ``;  //Does not exist for scratch org, no connection record
      destinationRefreshToken = `${scratchConn.getAuthInfo().getFields().refreshToken}`;
      destinationOrgType = `Sandbox`;
      destinationOrgId = `${this.org.getOrgId()}`;
      destinationUserId = `${scratchConn.getAuthInfo().getFields().userId}`;
      destinationInstanceUrl = `${scratchConn.getAuthInfo().getFields().instanceUrl}`;
    }

    //Retrieve the data set or deployment plan to deploy
    this.ux.log(`Retrieving data set or deployment plan to deploy.`);

    if( datasetFlag !== undefined ) {
      const isId = orgIdRegxp.test(datasetFlag);

      this.ux.log("Is org ID: " + isId);

      let queryData;
      
      if( isId ) {
        queryData  = `Select Id, Name from PDRI__DataSet__c where PDRI__Active__c = true AND Id = '` + datasetFlag + `' order by lastmodifieddate desc limit 1`;
      } else {
        queryData  = `Select Id, Name from PDRI__DataSet__c where PDRI__Active__c = true AND Name = '` + datasetFlag + `' order by lastmodifieddate desc limit 1`;
      }

      this.ux.log("Running query: " + queryData);

      // Query the org
      const result = await hubConn.query<DataSet>(queryData);
  
      // The output and --json will automatically be handled for you.
      if (!result.records || result.records.length <= 0) {
        throw new core.SfdxError(messages.getMessage('errorNoDataSetFound', [datasetFlag]));
      }
  
      deployDataSet = result.records[0];
      this.ux.log(`Retrieved deploy data set record.`);
    } else if( planFlag !== undefined ) {
      const isId = orgIdRegxp.test(planFlag);

      let queryData;

      if( isId ) {
        queryData = `Select Id, Name from PDRI__Deployment_Plan__c where Id = '` + datasetFlag + `' order by lastmodifieddate desc limit 1`;
      } else {
        queryData = `Select Id, Name from PDRI__Deployment_Plan__c where Name = '` + datasetFlag + `' order by lastmodifieddate desc limit 1`;
      }

      this.ux.log("Running query: " + queryData);

      // Query the org
      const result = await hubConn.query<DeploymentPlan>(queryData);
  
      // The output and --json will automatically be handled for you.
      if (!result.records || result.records.length <= 0) {
        throw new core.SfdxError(messages.getMessage('errorNoDeploymentPlanFound', [datasetFlag]));
      }
  
      deployDataSet = result.records[0];
      this.ux.log(`Retrieved deploy deployment plan record.`);
    }

    //Insert the new deployment result record
    this.ux.log(`Inserting the new deployment result record in the dev hub control org.`);

    const insertResult = await hubConn.insert("PDRI__Deployment_Result__c", 
      [{ "PDRI__Status__c" : "Submitted", "PDRI__Source_Connection__c" : `${sourceRecordId}`, "PDRI__Target_Connection__c" : `${destinationRecordId}` }]);

    this.ux.log(`Inserting result success: ` + insertResult[0].success);
    if( !insertResult[0].success ) {
      const insertError = insertResult[0].errors;
      throw new core.SfdxError(messages.getMessage('errorCreatingDeploymentResult', [insertError]));
    }

    //Construct the dpeloyment request and make the callout to submit it
    this.ux.log(`Constructing deployment request.`);

    const contextUserId = `${hubConn.getAuthInfo().getFields().userId}`;
    const deploymentResultId = `${insertResult[0].id}`;

    const param = { 'deploymentResultId' : `${deploymentResultId}`, 
      'submitterUserId' : `${contextUserId}`, 
      'submitterUserEmail' : 'drudman@prodly.co', 
      'submitterUserFullName' : 'Daniel Rudman',
      'packageNameSpace' : 'PDRI',
      'sourceOrgConnection' : { 'recordId' : `${sourceRecordId}`, 
        'refreshToken' : `${sourceRefreshToken}`, 
        'orgType' : `${sourceOrgType}`, 
        'orgId' : `${sourceOrgId}`, 
        'userId' : `${sourceUserId}`, 
        'instanceUrl' : `${sourceInstanceUrl}` },
      'targetOrgConnection' : { 'recordId' : `${destinationRecordId}`, 
        'refreshToken' : `${destinationRefreshToken}`, 
        'orgType' : `${destinationOrgType}`, 
        'orgId' : `${destinationOrgId}`, 
        'userId' : `${destinationUserId}`, 
        'instanceUrl' : `${destinationInstanceUrl}` },
      'controlOrgConnection' : { 'recordId' : `${controlConnection.Id}`, 
        'refreshToken' : `${controlConnection.PDRI__Refresh_Token__c}`, 
        'orgType' : `${controlConnection.PDRI__Org_Type__c}`, 
        'orgId' : `${controlConnection.PDRI__OrganizationId__c}`, 
        'userId' : `${controlConnection.PDRI__User_Id__c}`, 
        'instanceUrl' : `${controlConnection.PDRI__Instance_URL__c}` } };

    this.ux.log("Invoking deployment request with the Moover service");

    const data = JSON.stringify(param);

    //this.ux.log(`Data: ${data}`);

    const https = require('https');
    const path = datasetFlag !== undefined ? '/dataset/deploy' : '/plan/deploy';

    this.ux.log(`Path: ${path}`);
    this.ux.log(`Host: deployer.prodly.co`);
    
    const options = {
      hostname: 'deployer.prodly.co',
      port: 80,
      path: `${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      this.ux.log(`statusCode: ${res.statusCode}`)
    
      res.on('data', (d) => {
        this.ux.log(d)
      })
    })
    
    req.on('error', (error) => {
      this.ux.log(error)
    })
    
    req.write(data)
    req.end()

    const outputString = `Deployment launched with the result ID ${deploymentResultId}`;

    // Return an object to be displayed with --json
    return { resultId: `${deploymentResultId}`, outputString };
  }
}
