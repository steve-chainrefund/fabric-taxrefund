'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode Invoke
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
// var peer = fabric_client.newPeer('grpc://chainrefund.chain-taxrefund.com:8051');
var peer = fabric_client.newPeer('grpc:localhost:10051');
// var peer = fabric_client.newPeer('grpc://ec2-13-209-41-39.ap-northeast-2.compute.amazonaws.com:7051');
channel.addPeer(peer);
channel.addPeer(fabric_client.newPeer('grpc://localhost:9051'));
// channel.addPeer(fabric_client.newPeer('grpc://ec2-52-78-238-132.ap-northeast-2.compute.amazonaws.com:7051'));
var order = fabric_client.newOrderer('grpc://localhost:7050');
// var order = fabric_client.newOrderer('grpc://ec2-13-124-220-188.ap-northeast-2.compute.amazonaws.com:7050')
channel.addOrderer(order);

var store_path = path.join(__dirname, 'hfc-key-store');

var fabric_ca_client = null;
var tx_id = null;
var request = {};

var path = require('path');
var util = require('util');
var os = require('os');
//

console.log(' Store path:' + store_path);
var user_id = 'bong';
//User ID
var client_id = 'bruce';
var store_id = 'bong';
var tx_id_string=null
//amount for tax refund
var amount = '1230';

var currentDate = new Date();
// var datetime = currentDate.getFullYear()+"-"
// 	+(currentDate.getMonth()+1)+"-"+
// 	currentDate.getDate()+" "+
// 	currentDate.getHours()+":"+
//     currentDate.getMinutes()+":"+
//     currentDate.getSeconds();

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({
    path: store_path
}).then((state_store) => {
    // assign the store to the fabric client
    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    // use the same location for the state store (where the users' certificate are kept)
    // and the crypto store (where the users' keys are kept)
    var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);

    var tlsOptions = {
        trustedRoots: [],
        verify: false
    };
    console.log('0. "client" user - {client_id: ' + store_id + '} from persistence');

    fabric_ca_client = new Fabric_CA_Client('http://localhost:7054', tlsOptions, 'ca.fabric-taxrefund.com', crypto_suite);
    // get the enrolled user from persistence, this user will sign all requests
    return fabric_client.getUserContext(store_id, true);
}).then(async (user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('1. Successfully loaded "client" user - {client_id: ' + store_id + '} from persistence');
    } else {
        throw new Error('Failed to get "client user" - {client_id: ' + store_id + '} .... run registerUser.js');
    }


    tx_id = fabric_client.newTransactionID();
    console.log("4. Assigning transaction_id: ", tx_id.getTransactionID());

    // get a transaction id object based on the current user assigned to fabric client

    let requestData = new Object();
    let object1 = new Object();
    let object2 = new Object();
    let object3 = new Object();
    object1.reference_id = "123"
    object1.tx_status = "123"
    object1.request_type = "Refund-Complete"
    object1.refund_type = "123"
    object1.cur_tx_id = "123"
    object1.prev_tx_id = "123"
    object3.prodNm = "123"
    object3.IneNo = "123"
    object3.prdCode = "123"
    object3.indQty = "123"
    object3.indPrice = "123"
    object3.salePrice = "123"
    object3.indVat = "123"
    object3.indIct = "123"
    object3.indEdut = "123"
    object3.indStr = "123"
    object2.customer_id = "teruwa"
    object2.taxRefunder_id = "teruwa"
    object2.store_id = "teruwa"
    object2.tx_created = "123"
    object2.purchsSn = "123"
    object2.saleDatm = "123"
    object2.totAmt = "123"
    object2.totQty = "123"
    object2.totRefund = "123"
    object2.totVat = "123"
    object2.totIct = "123"
    object2.totEdut = "123"
    object2.totStr = "123"
    object2.details = [];
    object2.details.push(object3)

    requestData.header = object1
    requestData.body = object2


    try {
        // first setup the client for this org


        // will need the transaction ID string for the event registration later
        tx_id_string = tx_id.getTransactionID();

        // must send the proposal to endorsing peers
        request = {
            //targets: let default to the peer assigned to the client
            chaincodeId: 'cc-payment',
            chaincodeVersion: 'v1.1',
            fcn: 'invokeRefundComplete',
            args: ['Client.refunder', JSON.stringify(requestData)],
            chainId: 'ch-taxrefund',
            txId: tx_id
        };

        let results = await channel.sendTransactionProposal(request);

        // the returned object has both the endorsement results
        // and the actual proposal, the proposal will be needed
        // later when we send a transaction to the orderer
        var proposalResponses = results[0];
        var proposal = results[1];

        // lets have a look at the responses to see if they are
        // all good, if good they will also include signatures
        // required to be committed
        var all_good = true;
        for (var i in proposalResponses) {
            let one_good = false;
            if (proposalResponses && proposalResponses[i].response &&
                proposalResponses[i].response.status === 200) {
                one_good = true;
                console.log('invoke chaincode proposal was good');
            } else {
                console.log('invoke chaincode proposal was bad');
            }
            all_good = all_good & one_good;
        }
        // console.log('<------------------------------------------------------------------------------------------------------->')
        // console.log('result: ' + JSON.stringify(results))
        // console.log('<------------------------------------------------------------------------------------------------------->')
        if (all_good) {

            var error_message = null;

            if (all_good) {
                console.log(util.format(
                    '6. Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
                    proposalResponses[0].response.status, proposalResponses[0].response.message,
                    proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));

                // wait for the channel-based event hub to tell us
                // that the commit was good or bad on each peer in our organization
                var promises = [];
                let event_hubs = fabric_client.newEventHub();
                event_hubs.setPeerAddr('grpc://localhost:7053');
                console.log('invokeEventPromise - setting up event');
                let invokeEventPromise = new Promise((resolve, reject) => {
                    let event_timeout = setTimeout(() => {
                        let message = 'REQUEST_TIMEOUT:' + event_hubs.getPeerAddr();
                        console.log(message);
                        event_hubs.disconnect();
                    }, 3000);
                    event_hubs.connect();
                    event_hubs.registerTxEvent(tx_id_string, (tx, code) => {
                            console.log('The chaincode invoke chaincode transaction has been committed on peer %s', event_hubs.getPeerAddr());
                            console.log('Transaction %s has status of %s in blocl %s', tx, code);
                            clearTimeout(event_timeout);

                            if (code !== 'VALID') {
                                let message = util.format('The invoke chaincode transaction was invalid, code:%s', code);
                                console.log(message);
                                reject(new Error(message));
                            } else {
                                let message = 'The invoke chaincode transaction was valid.';
                                console.log(message);
                                resolve(message);
                            }
                        }, (err) => {
                            clearTimeout(event_timeout);
                            console.log(err);
                            reject(err);
                        },
                        // the default for 'unregister' is true for transaction listeners
                        // so no real need to set here, however for 'disconnect'
                        // the default is false as most event hubs are long running
                        // in this use case we are using it only once
                        {unregister: true, disconnect: true}
                    );

                });
                promises.push(invokeEventPromise);


                var orderer_request = {
                    txId: tx_id,
                    proposalResponses: proposalResponses,
                    proposal: proposal
                };
                var sendPromise = channel.sendTransaction(orderer_request);
                // put the send to the orderer last so that the events get registered and
                // are ready for the orderering and committing
                promises.push(sendPromise);
                let results = await Promise.all(promises);
                console.log(util.format('------->>> R E S P O N S E : %j', results));
                let response = results.pop(); //  orderer results are last in the results
                if (response.status === 'SUCCESS') {
                    console.log('Successfully sent transaction to the orderer.');
                } else {
                    error_message = util.format('Failed to order the transaction. Error code: %s', response.status);
                    console.log(error_message);
                }

                // now see what each of the event hubs reported
                for (let i in results) {
                    let event_hub_result = results[i];
                    let event_hub = event_hubs[i];
                    console.log('Event results for event hub :%s', event_hub.getPeerAddr());
                    if (typeof event_hub_result === 'string') {
                        console.log(event_hub_result);
                    } else {
                        if (!error_message) error_message = event_hub_result.toString();
                        console.log(event_hub_result.toString());
                    }
                }
            } else {
                error_message = util.format('Failed to send Proposal and receive all good ProposalResponse');
                console.log(error_message);
            }
        } else {
            console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
            throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
        }
    } catch (error) {
        console.log('Failed to invoke due to error: ' + error.stack ? error.stack : error);
        error_message = error.toString();
    }

    if (!error_message) {
        let message = util.format(
            'Successfully invoked the chaincode %s to the channel \'%s\' for transaction ID: %s',
            'cc-taxrefund', 'ch-taxrefund', tx_id_string);
        console.log(message);

        return tx_id_string;
    } else {
        let message = util.format('Failed to invoke chaincode. cause:%s', error_message);
        console.log(message);
        throw new Error(message);
    }
// }).then((results) => {
//     console.log('8. Send transaction completed: ' + JSON.stringify(results));
//     // check the results in the order the promises were added to the promise all list
//     if (results && results[0] && results[0].status === 'SUCCESS') {
//         console.log('9. Successfully sent transaction to the orderer.');
//     } else {
//         console.error('Failed to order the transaction. Error code: ' + response.status);
//     }
//
//     if (results && results[1] && results[1].event_status === 'VALID') {
//         console.log('10. Successfully committed the change to the ledger by the peer');
//     } else {
//         console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
//     }
}).catch((err) => {
    console.error('Failed to invoke successfully :: ' + err);
});
