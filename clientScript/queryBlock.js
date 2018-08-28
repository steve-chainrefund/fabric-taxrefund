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
var charset= require('charset')
var jschardet = require('jschardet');
var iso88592 = require('iso-8859-2');
var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel('ch-taxrefund');
var peer = fabric_client.newPeer('grpc://localhost:7051');
var orderer= fabric_client.newOrderer('grpc://localhost:7050')
channel.addPeer(peer);
channel.addOrderer(orderer)
//
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
var tx_id = null;
var user_id = 'teruwa';
var role_type = null;
var fabric_ca_client = null;
var crypto_store = null;
var request = {};


// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({
    path: store_path
}).then((state_store) => {
    // assign the store to the fabric client
    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    // use the same location for the state store (where the users' certificate are kept)
    // and the crypto store (where the users' keys are kept)
    crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);

    // get the enrolled user from persistence, this user will sign all requests
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

    // if you want to scan data by transaction id, this code will be executed
    tx_id = '274fd846e4d24beaca273ba13a6b9ba4a429f52c6595455b512b2b7563434e4e';


    // send the query proposal to the peer
    // return channel.queryBlock(8, peer);
    // return channel.getGenesisBlock(orderer);
    return channel.queryInfo(peer);
    // return channel.queryTransaction(tx_id,peer);
    // return channel.getOrderers();
    // return channel.getChannelConfig();

}).then(async (query_responses) => {
    // query_responses could have more than one  results if there multiple peers were used as targets
    console.log('3. Query_responses Data ------> ' + JSON.stringify(query_responses));
    if (query_responses) {
        if (!query_responses[0] instanceof Error) {
            console.error("error from query = ", query_responses[0]);
        } else {
            // console.log("5. Response is ", query_responses[0].toString());
            // var result = query_responses.data.data[0].payload.data.actions[0].payload.chaincode_proposal_payload.input;
            // var result = query_responses.currentBlockHash.buffer;
            // var result = query_responses.data.data[0].signature;

            // Total Block Size
            let blockLength = query_responses.height.low;


            // let blockLength = 8;
            // console.log("4. Get Peer Query has been completed, Result: " + (query_responses.data.data[0].buffer.toString('ascii')));
            console.log("4. BlockInfo Query has been completed, Block Size: " + blockLength);
            let promises = [];
            for (let i = blockLength - 2; i > (blockLength - 3); i--) {
                let queryBlockList = new Promise((resolve, reject) => {
                    channel.queryBlock(i, peer).then((blockResponse) => {
                        console.log("blockResponse " + i)
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

                    //정규표현식으로 데이터 추출하기 위한 변수 지정
                    var regex = /\S+/g;
                    var match = [];
                    // console.log("Encoded 88592: "+text);
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