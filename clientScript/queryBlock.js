/*
 * Block Data query
 */


var Fabric_Client = require('fabric-client');
var path = require('path');
var fabric_client = new Fabric_Client();

var channel = fabric_client.newChannel('ch-taxrefund');
var peer = fabric_client.newPeer('grpc://localhost:7051');
var orderer= fabric_client.newOrderer('grpc://localhost:7050')
channel.addPeer(peer);
channel.addOrderer(orderer)
//
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
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
        console.log('##. Signing ID: ' + result.enrollment.signingIdentity)
    } else {
        throw new Error('Failed to get ' + user_id + '.... run registerUser.js');
    }
    return channel.queryInfo(peer);
}).then(async (query_responses) => {
    console.log('3. Query_responses Data ------> ' + JSON.stringify(query_responses));
    if (query_responses) {
        if (!query_responses[0] instanceof Error) {
            console.error("error from query = ", query_responses[0]);
        } else {

            // Total Block Size
            let blockLength = query_responses.height.low;
            console.log("4. BlockInfo Query has been completed, Block Size: " + blockLength);
            let promises = [];
            for (let i = blockLength - 2; i > (blockLength - 3); i--) {
                let queryBlockList = new Promise((resolve, reject) => {
                    channel.queryBlock(i, peer).then((blockResponse) => {
                        if (blockResponse) {
                            resolve(blockResponse);
                        } else {
                            reject("error!!")
                        }

                    });

                })
                promises.push(queryBlockList);

            }

            let blockResponses = await Promise.all(promises);

            for (let i in blockResponses) {
                console.log("5. Block Data: " + JSON.stringify(blockResponses[i]));
                // Block / Header
                let number = blockResponses[i].header.number;
                let previous_hash = blockResponses[i].header.previous_hash;
                let data_hash = blockResponses[i].header.data_hash;

                // Block / Data / Channel Header
                let channel_id = blockResponses[i].data.data[0].payload.header.channel_header.channel_id;
                let timestamp = blockResponses[i].data.data[0].payload.header.channel_header.timestamp
                let tx_id = blockResponses[i].data.data[0].payload.header.channel_header.tx_id;
                let tx_version = blockResponses[i].data.data[0].payload.header.channel_header.version;
                let tx_type = blockResponses[i].data.data[0].payload.header.channel_header.type;
                let type_string = blockResponses[i].data.data[0].payload.header.channel_header.typeString

                // Block / Data / Signature Header
                let creator_mspid = blockResponses[i].data.data[0].payload.header.signature_header.creator.Mspid
                let creator_idbytes = blockResponses[i].data.data[0].payload.header.signature_header.creator.IdBytes;


                // Block / MetaData
                let ordererMspId = blockResponses[i].metadata.metadata[0].signatures[0].signature_header.creator.Mspid
                let ordererIdBytes = blockResponses[i].metadata.metadata[0].signatures[0].signature_header.creator.IdBytes


                console.log("5-1. Block header, number: " + number);
                console.log("5-2. Block header, previous_hash: " + previous_hash);
                console.log("5-3. Block header, data_hash: " + data_hash);
                console.log("5-4. Block data, channel_id: " + channel_id);
                console.log("5-5. Block data, timestamp: " + timestamp);
                console.log("5-6. Block data, tx_id: " + tx_id);
                console.log("5-7. Block data, tx_version: " + tx_version);
                console.log("5-8. Block data, tx_type: " + tx_type);
                console.log("5-9. Block data, type_string: " + type_string);
                console.log("5-10. Block data, creator_mspid: " + creator_mspid);
                console.log("5-11. Block data, creator_idbytes: " + creator_idbytes);
                console.log("5-12. Block metadata, ordererMspId: " + ordererMspId);
                console.log("5-13. Block metadata, ordererIdBytes: " + ordererIdBytes);


                // related to channel command
                if (tx_type===1){


                // related to chaincode command
                }else if (tx_type===3){

                    // Block / Data / ChainCode Endorsement
                    let endorsements = blockResponses[i].data.data[0].payload.data.actions[0].payload.action.endorsements

                    for (let j in endorsements){
                        let endorser_mspid = blockResponses[i].data.data[0].payload.data.actions[0].payload.action.endorsements[j].endorser.Mspid
                        let endorser_idbytes = blockResponses[i].data.data[0].payload.data.actions[0].payload.action.endorsements[j].endorser.IdBytes
                        console.log("5-14-%s. Block data, endorser_mspid - %s: " + endorser_mspid, j+1,j+1);
                        console.log("5-15-%s. Block data, endorser_idbytes - %s: " + endorser_idbytes, j+1,j+1);
                    }


                    // Block / Data / ChainCode Proposal Payload
                    let proposal_chaincode = blockResponses[i].data.data[0].payload.data.actions[0].payload.chaincode_proposal_payload.input;
                    let proposal_chaincode_name = null;
                    let proposal_chaincode_type = null;
                    let proposal_function_name = null;

                    var regex = /\S+/g;
                    var match = [];
                    if (match = proposal_chaincode.toString('ascii').match(regex)) {

                        // case: instantiate or upgrade chaincode
                        if (tx_version===0){
                            proposal_chaincode_name = match[5];
                            proposal_function_name = match[6];
                            proposal_chaincode_type = match[1];
                            console.log("5-16. Block data, chaincodeName: " + proposal_chaincode_name);
                            console.log("5-17. Block data, proposalFunctionName: " + proposal_function_name);
                            console.log("5-18. Block data, proposalFunctionName: " + proposal_chaincode_type);
                        // case: invoke chaincode
                        } else{

                            proposal_chaincode_name = match[1];
                            proposal_function_name = match[2];
                            proposal_chaincode_type = 'invoke';
                            console.log("5-16. Block data, chaincodeName: " + proposal_chaincode_name);
                            console.log("5-17. Block data, proposalFunctionName: " + proposal_function_name);
                            console.log("5-18. Block data, proposalFunctionName: " + proposal_chaincode_type);
                        }

                    }

                    // Block / Data / Chaincode Response
                    let proposal_hash = blockResponses[i].data.data[0].payload.data.actions[0].payload.action.proposal_response_payload.proposal_hash
                    let response_status= blockResponses[i].data.data[0].payload.data.actions[0].payload.action.proposal_response_payload.extension.response.status
                    let response_chaincode_version = blockResponses[i].data.data[0].payload.data.actions[0].payload.action.proposal_response_payload.extension.chaincode_id.version
                    let response_chaincode_name = blockResponses[i].data.data[0].payload.data.actions[0].payload.action.proposal_response_payload.extension.chaincode_id.name;

                    if (tx_version===0) response_chaincode_name = blockResponses[i].data.data[0].payload.data.actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.reads[0].key;


                    console.log("5-19. Block data, proposal_hash: " + proposal_hash);
                    console.log("5-20. Block data, response_status: " + response_status);
                    console.log("5-21. Block data, response_chaincode_name: " + response_chaincode_name);
                    console.log("5-22. Block data, response_chaincode_version: " + response_chaincode_version);

                }


            }
        }
    }
}).catch((err) => {
    console.error('Failed to query successfully :: ' + err);
});