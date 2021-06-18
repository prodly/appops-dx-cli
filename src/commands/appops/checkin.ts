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
    token: flags.string({char: 't', description: messages.getMessage('tokenFlagDescription')})
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static requiresDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    const instanceFlag = this.flags.instance;
    const vcsToken = this.flags.token;

    this.ux.log("Instance flag: " + instanceFlag);

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const hubConn = this.hubOrg.getConnection();

    let mangedInstanceId = null;

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
            throw new core.SfdxError(messages.getMessage('errorManagedInstaceNotFound')); 
        }
        this.ux.log(`Managed instance ID retrieved, using instance with id ${managedInstance.Id}`);
        mangedInstanceId =  managedInstance.Id;

        //Update the connection with the latest access token
        this.ux.log("Updating the connection with the latest access token");
        await this.updateConnection(managedInstance.connectionId, this.org, hubConn);
    }

    //Perform the checkin
    await this.checkinInstance(mangedInstanceId, vcsToken, hubConn);

    return '{}';
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

  async checkinInstance(mangedInstanceId, vcsToken, hubConn) {
    this.ux.log(`Performing checkin for managed instance with id ${mangedInstanceId}.`);

    let path = '/services/apexrest/PDRI/v1/instances/' + mangedInstanceId + '/checkin';

    let request = {
        body : '',
        method : 'POST',
        headers : { 'vcs-access-token': vcsToken },
        url : path
    }

    await hubConn.request(request, function(err, res) {
        if (err) { 
            throw new core.SfdxError(err); 
        }
        console.log("Checkin instance response: ", JSON.stringify(res));
    });
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


