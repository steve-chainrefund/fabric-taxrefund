/*
 * Register and Enroll a user
 */

var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');
var path = require('path');
var fabric_client = new Fabric_Client();
var fabric_ca_client = null;
var admin_user = null;
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
var user_id='store1';
var admin_id='admin';
var user_role='Client.store';
var mspID='CustomOrgMSP';
var password='1234';
var user_affiliation='store.org';
Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);

    var	tlsOptions = {
    	trustedRoots: [],
    	verify: false
    };
    fabric_ca_client = new Fabric_CA_Client('https://localhost:7054', tlsOptions , 'ca.fabric-taxrefund.com', crypto_suite);

    return fabric_client.getUserContext(admin_id, true);
}).then((user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('1. Successfully loaded {admin} from persistence - in order to access CA Server via admin certificate');
        admin_user = user_from_store;
    } else {
        throw new Error('Failed to get admin.... run enrollAdmin.js');
    }


    return fabric_ca_client.register({enrollmentID: user_id, affiliation: user_affiliation, role: user_role, enrollmentSecret: password}, admin_user);
}).then((secret) => {
    console.log('2. Successfully registered {user_id: '+user_id+', affiliation: '+user_affiliation+', role: '+user_role+', secret:' + secret+'}');

    return fabric_ca_client.enroll({enrollmentID: user_id, enrollmentSecret: password});
}).then((enrollment) => {
  console.log('3. Successfully enrolled member user {id: ' +user_id+ '}');
  return fabric_client.createUser(
     {username: user_id,
         role: user_role,
         affiliation: user_affiliation,
         mspid: mspID,
         cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
     });
}).then((user) => {
    console.log('4. ' + user_id + ' was successfully registered and enrolled and is ready to interact with the fabric network' );
     member_user = user;
     user.setRoles(user_role);
     user.setAffiliation(user_affiliation);

     return fabric_client.setUserContext(member_user);
}).then(()=> {
    console.log('4. ' + user_id + '`s certificate was successfully set up with roles and affiliation' );

}).catch((err) => {
    console.error('Failed to register: ' + err);
	if(err.toString().indexOf('Authorization') > -1) {
		console.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
		'Try again after deleting the contents of the store directory '+store_path);
	}
});
