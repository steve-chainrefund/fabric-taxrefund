
/*
 * Chaincode Invoke
 */


var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');
var path = require('path');

var fabric_client = new Fabric_Client();
var channel = fabric_client.newChannel('ch-taxrefund');
var peer = fabric_client.newPeer('grpc:localhost:7051');
channel.addPeer(peer);
channel.addPeer(fabric_client.newPeer('grpc://localhost:11051'));
var order = fabric_client.newOrderer('grpc://localhost:7050');
channel.addOrderer(order);
var store_path = path.join(__dirname, 'hfc-key-store');

var fabric_ca_client = null;
var tx_id = null;
var request = {};

//User ID
var customer_id = 'customer1';
var store_id = 'store1';
var refunder_id = 'refunder1';
var funtionName = 'invokePending'


Fabric_Client.newDefaultKeyValueStore({
    path: store_path
}).then((state_store) => {

    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
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
}).then((user_from_store) => {

    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('1. Successfully loaded "client" user - {client_id: ' + store_id + '} and Role: %s', user_from_store.getRoles());
    } else {
        throw new Error('Failed to get "client user" - {client_id: ' + store_id + '} .... register user first');
    }

    tx_id = fabric_client.newTransactionID();
    let requestData = {};
    let object1 = {};
    let object2 = {};
    let object3 = {};
    object1.reference_id = tx_id.getTransactionID()
    object1.tx_status = "1"
    object1.request_type = "101"
    object1.refund_type = "1"
    object1.cur_tx_id = tx_id.getTransactionID()
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

    // must send the proposal to endorsing peers
    request = {
        //targets: let default to the peer assigned to the client
        chaincodeId: 'cc-taxrefund',
        chaincodeVersion: '1.0',
        fcn: funtionName,
        args: ['Client.store', JSON.stringify(requestData)],
        chainId: 'ch-taxrefund',
        txId: tx_id
    };

    console.log("2. Send Transaction Request - ", JSON.stringify(requestData));


    return channel.sendTransactionProposal(request);
}).then((results) => {
    var proposalResponses = results[0];
    var proposal = results[1];
    let isProposalGood = false;
    if (proposalResponses && proposalResponses[0].response &&
        proposalResponses[0].response.status === 200) {
        isProposalGood = true;
        // console.log('Transaction proposal was good');
    } else {
        // console.error('Transaction proposal was bad');
    }
    if (isProposalGood) {
        console.log('3. Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s" <\br> result: %s',
            proposalResponses[0].response.status, proposalResponses[0].response.message);

        var request = {
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        var transaction_id_string = tx_id.getTransactionID();
        var promises = [];

        var sendPromise = channel.sendTransaction(request);
        promises.push(sendPromise);
        let event_hub = fabric_client.newEventHub();
        event_hub.setPeerAddr('grpc://localhost:7053');

        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(() => {
                event_hub.disconnect();
                resolve({event_status: 'TIMEOUT'});
            }, 10000);
            event_hub.connect();
            event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
                clearTimeout(handle);
                event_hub.unregisterTxEvent(transaction_id_string);
                event_hub.disconnect();

                var return_status = {event_status: code, tx_id: transaction_id_string};
                if (code !== 'VALID') {
                    console.error('The transaction was invalid, code = ' + code);
                    resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
                } else {
                    console.log('7. The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
                    resolve(return_status);
                }
            }, (err) => {
                reject(new Error('There was a problem with the eventhub ::' + err));
            });
        });
        promises.push(txPromise);

        return Promise.all(promises);
    } else {
        console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
        throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
    }
}).then((results) => {
    endTime = new Date().getTime();
    console.log('8. Send transaction completed and time takes : ' + (endTime - startTime) / 1000 + ' sec');
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

