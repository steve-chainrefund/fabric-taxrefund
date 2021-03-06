

var Fabric_Client = require('fabric-client');
var path = require('path');
var fabric_client = new Fabric_Client();
var channel = fabric_client.newChannel('ch-taxrefund');
var peer = fabric_client.newPeer('grpc://localhost:7051');
var orderer = fabric_client.newOrderer('grpc://localhost:7050')
channel.addPeer(peer);
channel.addOrderer(orderer)
//
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
var tx_id = null;
var user_id = 'store1';
var crypto_store = null;


Fabric_Client.newDefaultKeyValueStore({
    path: store_path
}).then((state_store) => {
    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);
    return fabric_client.getUserContext(user_id, true);
}).then((user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('1. Successfully loaded {admin} from persistence - in order to access CA Server via admin certificate');
        member_user = user_from_store;
        var result = JSON.parse(member_user);
        console.log('##. User SigningID: ' + result.enrollment.signingIdentity)
    } else {
        throw new Error('Failed to get ' + user_id + '.... run registerUser.js');
    }

    return channel.queryTransaction(tx_id, peer);
}).then((query_responses) => {
    // query_responses could have more than one  results if there multiple peers were used as targets
    if (query_responses) {
        if (!query_responses instanceof Error) {
            console.error("error from query = ", query_responses);
        } else {
            console.log("2. Tx Data Response: " + JSON.stringify(query_responses));
            // Block / Header
            let block_number = query_responses.transactionEnvelope.payload.data.actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.reads[0].version.block_num;


            // Block / Data / Channel Header
            let channel_id = query_responses.transactionEnvelope.payload.header.channel_header.channel_id;
            let timestamp = query_responses.transactionEnvelope.payload.header.channel_header.timestamp
            let tx_id = query_responses.transactionEnvelope.payload.header.channel_header.tx_id;
            let tx_version = query_responses.transactionEnvelope.payload.header.channel_header.version;
            let tx_type = query_responses.transactionEnvelope.payload.header.channel_header.type;
            let type_string = query_responses.transactionEnvelope.payload.header.channel_header.typeString

            // Block / Data / Signature Header
            let creator_mspid = query_responses.transactionEnvelope.payload.header.signature_header.creator.Mspid
            let creator_idbytes = query_responses.transactionEnvelope.payload.header.signature_header.creator.IdBytes;

            console.log("5-1. Block header, number: " + block_number);
            console.log("5-4. Block data, channel_id: " + channel_id);
            console.log("5-5. Block data, timestamp: " + timestamp);
            console.log("5-6. Block data, tx_id: " + tx_id);
            console.log("5-7. Block data, tx_version: " + tx_version);
            console.log("5-8. Block data, tx_type: " + tx_type);
            console.log("5-9. Block data, type_string: " + type_string);
            console.log("5-10. Block data, creator_mspid: " + creator_mspid);
            console.log("5-11. Block data, creator_idbytes: " + creator_idbytes);

            // Block / Data / ChainCode Endorsement
            let endorsements = query_responses.transactionEnvelope.payload.data.actions[0].payload.action.endorsements

            for (let j in endorsements) {
                let endorser_mspid = endorsements[j].endorser.Mspid
                let endorser_idbytes = endorsements[j].endorser.IdBytes
                console.log("5-14-%s. Block data, endorser_mspid - %s: " + endorser_mspid, j + 1, j + 1);
                console.log("5-15-%s. Block data, endorser_idbytes - %s: " + endorser_idbytes, j + 1, j + 1);
            }


            // Block / Data / ChainCode Proposal Payload
            let proposal_chaincode = query_responses.transactionEnvelope.payload.data.actions[0].payload.chaincode_proposal_payload.input;
            let proposal_chaincode_name = null;
            let proposal_chaincode_type = null;
            let proposal_function_name = null;
            var regex = /\S+/g;
            var match = [];
            // console.log("Encoded 88592: "+text);
            if (match = proposal_chaincode.toString().match(regex)) {
                // case: invoke chaincode
                proposal_chaincode_name = match[2];
                proposal_function_name = match[3];
                proposal_chaincode_type = 'invoke';
                console.log("5-16. Block data, chaincodeName: " + proposal_chaincode_name);
                console.log("5-17. Block data, proposalFunctionName: " + proposal_function_name);
                console.log("5-18. Block data, proposal_chaincode_type: " + proposal_chaincode_type);


            }

            // Block / Data / Chaincode Response
            let proposal_hash = query_responses.transactionEnvelope.payload.data.actions[0].payload.action.proposal_response_payload.proposal_hash
            let response_status = query_responses.transactionEnvelope.payload.data.actions[0].payload.action.proposal_response_payload.extension.response.status
            let response_chaincode_version = query_responses.transactionEnvelope.payload.data.actions[0].payload.action.proposal_response_payload.extension.chaincode_id.version
            let response_chaincode_name = query_responses.transactionEnvelope.payload.data.actions[0].payload.action.proposal_response_payload.extension.chaincode_id.name;

            console.log("5-19. Block data, proposal_hash: " + proposal_hash);
            console.log("5-20. Block data, response_status: " + response_status);
            console.log("5-21. Block data, response_chaincode_name: " + response_chaincode_name);
            console.log("5-22. Block data, response_chaincode_version: " + response_chaincode_version);
        }
    }
}).catch((err) => {
    console.error('Failed to query successfully :: ' + err);
});