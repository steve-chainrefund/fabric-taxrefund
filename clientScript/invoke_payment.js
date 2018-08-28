
/*
 * Chaincode Invoke
 */

var Fabric_Client = require('fabric-client');
var path = require('path');
var fabric_client = new Fabric_Client();
var channel = fabric_client.newChannel('ch-taxrefund');
var peer = fabric_client.newPeer('grpc:localhost:10051');
channel.addPeer(peer);
channel.addPeer(fabric_client.newPeer('grpc://localhost:9051'));
var order = fabric_client.newOrderer('grpc://localhost:7050');
channel.addOrderer(order);
var store_path = path.join(__dirname, 'hfc-key-store');
var tx_id = null;
var request = {};
var util = require('util');
//User ID
var customer_id = 'customer1';
var store_id = 'store1';
var refunder_id = 'refunder1';
var funtionName = 'invokePending'
var chaincodeId = 'cc-payment'
var tx_id_string=null

Fabric_Client.newDefaultKeyValueStore({
    path: store_path
}).then((state_store) => {

    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);
    return fabric_client.getUserContext(store_id, true);
}).then(async (user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('1. Successfully loaded "client" user - {client_id: ' + store_id + '} from persistence');
    } else {
        throw new Error('Failed to get "client user" - {client_id: ' + store_id + '} .... run registerUser.js');
    }

    tx_id = fabric_client.newTransactionID();
    tx_id_string = tx_id.getTransactionID();
    let requestData = {};
    let object1 = {};
    let object2 = {};
    let object3 = {};
    object1.reference_id = tx_id_string
    object1.tx_status = "1"
    object1.request_type = "101"
    object1.refund_type = "1"
    object1.cur_tx_id = tx_id_string
    object3.prodNm = "123456789"
    object3.IneNo = "ine-1"
    object3.prdCode = "TestCode"
    object3.indQty = "3"
    object3.indPrice = "390000"
    object3.salePrice = "130000"
    object3.indVat = "39000"
    object3.indIct = "0"
    object3.indEdut = "0"
    object3.indStr = "0"
    object2.customer_id = customer_id
    object2.taxRefunder_id = refunder_id
    object2.store_id = store_id
    object2.purchsSn = "serial-001"
    object2.saleDatm = new Date.now().toString()
    object2.totAmt = "390000"
    object2.totQty = "3"
    object2.totRefund = "39000"
    object2.totVat = "39000"
    object2.totIct = "0"
    object2.totEdut = "0"
    object2.totStr = "0"
    object2.details = [];
    object2.details.push(object3)

    requestData.header = object1
    requestData.body = object2


    try {
        request = {
            chaincodeId: chaincodeId,
            chaincodeVersion: 'v1.0',
            fcn: funtionName,
            args: ['Client.refunder', JSON.stringify(requestData)],
            chainId: 'ch-taxrefund',
            txId: tx_id
        };

        let results = await channel.sendTransactionProposal(request);
        var proposalResponses = results[0];
        var proposal = results[1];

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

        if (all_good) {

            var error_message = null;

            if (all_good) {
                console.log(util.format(
                    '6. Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
                    proposalResponses[0].response.status, proposalResponses[0].response.message,
                    proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));

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
}).then((results) => {
    console.log('8. Send transaction completed: ' + JSON.stringify(results));
    if (results && results[0] && results[0].status === 'SUCCESS') {
        console.log('9. Successfully sent transaction to the orderer.');
    } else {
        console.error('Failed to order the transaction. Error code: ' + response.status);
    }

    if (results && results[1] && results[1].event_status === 'VALID') {
        console.log('10. Successfully committed the change to the ledger by the peer');
    } else {
        console.log('Transaction failed to be committed to the ledger due to ::' + results[1].event_status);
    }
}).catch((err) => {
    console.error('Failed to invoke successfully :: ' + err);
});
