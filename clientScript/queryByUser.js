/*
 * Chaincode query
 */

var Fabric_Client = require('fabric-client');
var path = require('path');
var fabric_client = new Fabric_Client();
var channel = fabric_client.newChannel('ch-taxrefund');
var peer = fabric_client.newPeer('grpc://localhost:7051');
channel.addPeer(peer);

var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);
var tx_id = null;
var user_id = 'store1';
var role_type=null;
var functionName='getTxByUserId';
var chaincodeName = null;
var crypto_store = null;
var request = {};

Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);
	return fabric_client.getUserContext(admin_id, true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
        console.log('1. Successfully loaded {%s} from persistence - in order to access CA Server via %s certificate', admin_id);
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get '+user_id+'.... run registerUser.js');
	}
    role_type = 'Client.store';
    console.log('2. Successfully loaded user membership info from CA Server - {user_id: '+user_id+', role: ' + role_type+'}');

	if (tx_id!==null){
        request = {
            chaincodeId: 'cc-taxrefund',
            fcn: 'getSingleTx',
            args: [tx_id]
        };
        return channel.getPeers();
	}

    if (role_type === 'Client.customer' || role_type === 'Client.store' || role_type === 'Client.refunder') {
        request = {
            chaincodeId: chaincodeName,
            fcn: functionName,
            args: [role_type, user_id]
        };
	} else if(role_type ==='Client.customs'){
        request = {
            chaincodeId: chaincodeName,
            fcn: 'getAllTx',
            args: ['Client.customs',0,10000]
        };
	} else {
        throw new Error('Failed to get user.... run registerUser.js');
	}

    console.log('3. Request Data by "role": '+role_type+' ------> ' + JSON.stringify(request));
	return channel.queryByChaincode(request);
}).then((query_responses) => {
	console.log("4. Query has completed, checking results: ");
	if (query_responses && query_responses.length == 1) {
		if (query_responses[0] instanceof Error) {
			console.error("error from query = ", query_responses[0]);
		} else {
            let result=query_responses[0]
            console.log("5. result: "+result);
        }
	} else {
		console.log("No payloads were returned from query");
	}
}).catch((err) => {
	console.error('Failed to query successfully :: ' + err);
});
