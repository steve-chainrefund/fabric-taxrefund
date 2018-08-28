#!/bin/bash


CHANNEL_NAME=$1
: ${CHANNEL_NAME:="ch-taxrefund"}
echo $CHANNEL_NAME

export FABRIC_CFG_PATH=$PWD
echo

OS_ARCH=$(echo "$(uname -s|tr '[:upper:]' '[:lower:]'|sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')" | awk '{print tolower($0)}')

## Generates Org certs using cryptogen tool

function generateCerts (){
	CRYPTOGEN=./../bin/cryptogen

	if [ -f "$CRYPTOGEN" ]; then
            echo "Using cryptogen -> $CRYPTOGEN"
	else
	    echo "Building cryptogen"
#	    make -C $FABRIC_ROOT release
	fi

	echo
	echo "##########################################################"
	echo "##### Generate certificates using cryptogen tool #########"
	echo "##########################################################"
	$CRYPTOGEN generate --config=./crypto-config.yaml
	echo
}



function generateChannelArtifacts() {
	CONFIGTXGEN=./../bin/configtxgen
	if [ -f "$CONFIGTXGEN" ]; then
            echo "Using configtxgen -> $CONFIGTXGEN"
	else
	    echo "Building configtxgen"
	fi


	echo "##########################################################"
	echo "#########  Generating Orderer Genesis block ##############"
	echo "##########################################################"
	$CONFIGTXGEN -profile TaxRefundOrdererGenesis -outputBlock ./channel-artifacts/genesis.block

	echo
	echo "#################################################################"
	echo "### Generating channel configuration transaction 'channel.tx' ###"
	echo "#################################################################"
	$CONFIGTXGEN -profile TaxRefundChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME

	echo
	echo "#################################################################"
	echo "#######    Generating anchor peer update for CustomsOrg   ##########"
	echo "#################################################################"
	$CONFIGTXGEN -profile TaxRefundChannel -outputAnchorPeersUpdate ./channel-artifacts/CustomsOrgMSPanchors.tx -channelID $CHANNEL_NAME -asOrg CustomsOrgMSP

	echo
	echo "#################################################################"
	echo "#######    Generating anchor peer update for TaxRefundOrg1   ##########"
	echo "#################################################################"
	$CONFIGTXGEN -profile TaxRefundChannel -outputAnchorPeersUpdate ./channel-artifacts/TaxRefundOrg1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg TaxRefundOrg1MSP
	echo

	echo
	echo "#################################################################"
	echo "#######    Generating anchor peer update for TaxRefundOrg2   ##########"
	echo "#################################################################"
	$CONFIGTXGEN -profile TaxRefundChannel -outputAnchorPeersUpdate ./channel-artifacts/TaxRefundOrg2MSPanchors.tx -channelID $CHANNEL_NAME -asOrg TaxRefundOrg2MSP
	echo

	echo
	echo "#################################################################"
	echo "#######    Generating anchor peer update for StoreOrg1   ##########"
	echo "#################################################################"
	$CONFIGTXGEN -profile TaxRefundChannel -outputAnchorPeersUpdate ./channel-artifacts/StoreOrg1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg StoreOrg1MSP
	echo

	echo
	echo "#################################################################"
	echo "#######    Generating anchor peer update for StoreOrg2   ##########"
	echo "#################################################################"
	$CONFIGTXGEN -profile TaxRefundChannel -outputAnchorPeersUpdate ./channel-artifacts/StoreOrg2MSPanchors.tx -channelID $CHANNEL_NAME -asOrg StoreOrg2MSP
	echo
}


generateCerts
generateChannelArtifacts
