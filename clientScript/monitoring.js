var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');
var path = require('path');
var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel('ch-taxrefund');
var orderer = fabric_client.newOrderer('grpc://localhost:7050')
channel.addPeer(fabric_client.newPeer('grpc://localhost://7051'))
channel.addOrderer(orderer)
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
var user_id = 'admin';
var crypto_store = null;
var crypto_suite = null;
var fabric_ca_client = null;


// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
//
Fabric_Client.newDefaultKeyValueStore({
    path: store_path
}).then((state_store) => {
    // assign the store to the fabric client
    fabric_client.setStateStore(state_store);
    crypto_suite = Fabric_Client.newCryptoSuite();
    // use the same location for the state store (where the users' certificate are kept)
    // and the crypto store (where the users' keys are kept)
    crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);

    var tlsOptions = {
        trustedRoots: [],
        verify: false
    };

    // 1. CA 상태 체크: RDBMS 에서 주소 불러와서 밑에 DNS 세팅해 줄것
    // <주의 사항> https 로 해줘야함
    let caDNS = 'https://localhost:7054';
    fabric_ca_client = new Fabric_CA_Client(caDNS, tlsOptions, 'ca.fabric-taxrefund.com', crypto_suite);

    return fabric_client.getUserContext('admin', true);
}).then(async (user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('1. Successfully loaded {admin} from persistence - in order to access CA Server via admin certificate');
        member_user = user_from_store;
    } else {
        throw new Error('Failed to get ' + user_id + '.... run registerUser.js');
    }




    let promises = [];

    /**
     * CA Active 체크 하기
     */

    let caName = 'CA Server'
    let caReq = new Promise((resolve) => {
        fabric_ca_client.newIdentityService().getAll(member_user).then((user_info) => {

            console.log('3. Successfully type:' + user_info + '}');
            let response = {}
            response.name = caName;
            // response.result = blockResponse;
            response.status = '200';
            response.message = 'active';
            resolve(response);

        }).catch((error) => {
            let response = {}
            response.org_name = caName;
            response.result = error;
            response.status = '500';
            response.message = 'inactive';
            resolve(response)
            console.error('Failed: ' + response.message);
        });
    })
    promises.push(caReq);

    /**
     * Peer Active 체크 하기
     */

    // * 2. Peer 상태체크: RDBMS 에서 Peer 데이터 호출하여 다음과 같이 Array 형식으로 request data 만들것

    let peerDNSlist = [];
    let peer1 = {}
    let peer2 = {}
    let peer3 = {}
    peer1.org_name = 'taxrefundorg1'
    peer1.dns = 'grpc://localhost:7051'
    peer2.org_name = 'taxrefundorg2'
    peer2.dns = 'grpc://localhost:8051'
    peer3.org_name = 'storeorg1'
    peer3.dns = 'grpc://localhost:9051'
    peerDNSlist.push(peer1)
    peerDNSlist.push(peer2)
    peerDNSlist.push(peer3)

    // peer Node 에게 요청을 보내는 방식
    for (let i in peerDNSlist) {
        let peerReq = new Promise((resolve) => {
            var peer = fabric_client.newPeer(peerDNSlist[i].dns.toString());
            channel.getGenesisBlock(peer).then((blockResponse) => {
                if (blockResponse) {
                    let response = {}
                    response.name = peerDNSlist[i].org_name;
                    // response.result = blockResponse;
                    response.status = '200';
                    response.message = 'active';
                    resolve(response);

                }

            }).catch((error) => {
                let response = {}
                response.org_name = peerDNSlist[i].org_name;
                response.result = error;
                response.status = '500';
                response.message = 'inactive';
                resolve(response)
                console.error('Failed: ' + response.message);
            });

        })
        promises.push(peerReq);

    }

    /**
     * Order Active 체크 하기
     */

    // * 3. Orderer 상태체크: RDBMS 에서 Orderer 데이터 호출하여 다음과 같은 Array 형식으로 request data 만들것
    let ordererDNSlist = [];
    let orderer1 = {}
    orderer1.org_name = 'sysOrdrer'
    orderer1.dns = 'grpc://localhost:7050'
    orderer1.entity = 'ordrer'
    ordererDNSlist.push(orderer1)

    for (let i in ordererDNSlist) {
        let peerReq = new Promise((resolve) => {
            // var peer = fabric_client.newPeer(peerDNSlist[i].dns.toString());
            var orderer = fabric_client.newOrderer(ordererDNSlist[i].dns.toString());

            // channel.addPeer(peer)

            channel.getGenesisBlock(orderer).then((blockResponse) => {
                if (blockResponse) {
                    let response = {}
                    response.name = ordererDNSlist[i].org_name;
                    // response.result = blockResponse;
                    response.status = '200';
                    response.entity = ordererDNSlist[i].entity;
                    response.message = 'active';
                    resolve(response);

                }

            }).catch((error) => {
                let response = {}
                response.org_name = ordererDNSlist[i].org_name;
                response.result = error;
                response.status = '500';
                response.message = 'inactive';
                resolve(response)
                console.error('Failed: ' + response.message);
            });
        })
        promises.push(peerReq);
    }


    // 4. 결과값 받는 곳 --> 데이터 파싱하여 사용 하시오
    let blockResponses = await Promise.all(promises);
    for (let i in blockResponses) {
        // console.log("5. Block Data: " + JSON.stringify(blockResponses[i]));
        console.log("%s. 상태 체크: " + JSON.stringify(blockResponses[i]), i);
    }


}).catch((err) => {
    console.error('Failed to query successfully :: ' + err);
});