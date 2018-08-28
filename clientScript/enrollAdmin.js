
/*
 * Enroll the admin user
 */

var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');
var path = require('path');
var fabric_client = new Fabric_Client();
var fabric_ca_client = null;
var admin_user = null;
var user_id = 'admin'
var store_path = path.join(__dirname, 'hfc-key-store');
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
    return fabric_client.getUserContext(user_id, true);
}).then((user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('1. Successfully loaded admin from persistence');
        admin_user = user_from_store;
        return null;
    } else {
        return fabric_ca_client.enroll({enrollmentID: user_id, enrollmentSecret: '1234'})
            .then((enrollment) => {
          console.log('2. Successfully enrolled Admin user');


          return fabric_client.createUser(
              {username: user_id,
                  mspid: 'CustomOrgMSP',
                  cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
              });
        }).then((user) => {
          admin_user = user;
          return fabric_client.setUserContext(admin_user);
        }).catch((err) => {
          console.error('Failed to enroll and persist admin. Error: ' + err.stack ? err.stack : err);
          throw new Error('Failed to enroll admin');
        });
    }
}).then(() => {
    console.log('Assigned the admin user to the fabric client ::' + admin_user.toString());
}).catch((err) => {
    console.error('Failed to enroll admin: ' + err);
});
