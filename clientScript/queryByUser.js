'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode query
 */

var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');
var path = require('path');
var util = require('util');
var os = require('os');

//
var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel('ch-taxrefund');
var peer = fabric_client.newPeer('grpc://localhost:7051');
channel.addPeer(peer);

//
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);
var tx_id = null;
// var user_id = 'korea_tax_office';
var user_id = 'teruwa';
var role_type=null;
var admin_id='admin';

var fabric_ca_client = null;
var crypto_store = null;
var request = {};


// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	console.log('cryto_suite1'+JSON.stringify(state_store));
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);
    var	tlsOptions = {
        trustedRoots: [],
        verify: false
    };
    fabric_ca_client = new Fabric_CA_Client('https://localhost:7054', tlsOptions , 'ca.fabric-taxrefund.com', crypto_suite);
	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext(admin_id, true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
        console.log('1. Successfully loaded {%s} from persistence - in order to access CA Server via %s certificate', admin_id);
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get '+user_id+'.... run registerUser.js');
	}
	// queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
	// queryAllCars chaincode function - requires no arguments , ex: args: [''],



//     return fabric_ca_client.newIdentityService().getOne(user_id, user_from_store);
// }).then((identity) => {
    // next we need to enroll the user with CA server
    role_type = 'Client.store';
    console.log('2. Successfully loaded user membership info from CA Server - {user_id: '+user_id+', role: ' + role_type+'}');

	// if you want to scan data by transaction id, this code will be executed
	if (tx_id!==null){
        request = {
            //targets : --- letting this default to the peers assigned to the channel
            chaincodeId: 'cc-taxrefund',
            fcn: 'getSingleTx',
            args: [tx_id]
        };
        // send the query proposal to the peer
        // return channel.queryByChaincode(request);
        return channel.getPeers();
	}

    if (role_type === 'Client.customer') {
        request = {
            //targets : --- letting this default to the peers assigned to the channel
            chaincodeId: 'cc-taxrefund',
            // chaincodeVersion: 'v1.0',
            fcn: 'getTxByUserId',
            args: [role_type, user_id]
        };
    } else if (role_type === 'Client.store'){
        request = {
            //targets : --- letting this default to the peers assigned to the channel
            chaincodeId: 'cc-taxrefund',
            // chaincodeVersion: 'v1.0',
            fcn: 'getTxByUserId',
            args: [role_type, user_id]
        };
	} else if(role_type ==='Client.customs'){
        request = {
            //targets : --- letting this default to the peers assigned to the channel
            chaincodeId: 'cc-taxrefund',
            // chaincodeVersion: 'v1.0',
            fcn: 'getAllTx',
            args: ['Client.customs',0,10000]
        };
	} else {
        throw new Error('Failed to get user.... run registerUser.js');
	}

    console.log('3. Request Data by "role": '+role_type+' ------> ' + JSON.stringify(request));

	// send the query proposal to the peer
	return channel.queryByChaincode(request);
}).then((query_responses) => {
	console.log("4. Query has completed, checking results: ");
	// query_responses could have more than one  results if there multiple peers were used as targets
	if (query_responses && query_responses.length == 1) {
		if (query_responses[0] instanceof Error) {
			console.error("error from query = ", query_responses[0]);
		} else {
            let arrayRes = query_responses[0].toString().replace('');
            arrayRes = query_responses;
            var l1=JSON.stringify(query_responses[0].toString('utf-8')).length
            var l2= JSON.parse(JSON.stringify(query_responses[0].toString('utf-8')))
            console.log("l1: "+l1+", l2: "+l2.length+", l3 : "+query_responses[0].toString());

        }

	} else {
		console.log("No payloads were returned from query");
	}
}).catch((err) => {
	console.error('Failed to query successfully :: ' + err);
});
