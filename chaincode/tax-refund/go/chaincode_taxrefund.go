/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/


package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
	"time"
)

var index = 0

// Define the Smart Contract structure
type SmartContract struct {
}

// Define the tax refund structure, with 4 properties.  Structure tags are used by encoding/json library
type TaxRefundTXReceipt struct {
	Header TxHeader `json:"header"`
	Body   TxBody   `json:"body"`
}

type TxHeader struct {
	ReferenceId  string `json:"reference_id"`
	TxStatus     string `json:"tx_status"`
	RequestType  string `json:"request_type"`
	RefundType   string `json:"refund_type"`
	CurrentTxId  string `json:"cur_tx_id"`
}

type TxBody struct {
	CustomerId           string      `json:"customer_id"`
	TaxRefunderId        string      `json:"taxRefunder_id"`
	StoreId              string      `json:"store_id"`
	PurchaseSerialNumber string      `json:"purchsSn"`
	SalesDateTime		 string      `json:"saleDatm"`
	TotalAmount          string      `json:"totAmt"`
	TotalQuantity        string      `json:"totQty"`
	TotRefund            string      `json:"totRefund"`
	TotalVAT             string      `json:"totVat"`
	TotalIcTax           string      `json:"totIct"`
	TotalEduTax          string      `json:"totEdut"`
	Details              []TxDetails `json:"details"`
}

type TxDetails struct {
	ProductNumber  string `json:"prodNm"`
	IneNumber      string `json:"ineNo"`
	ProductCode    string `json:"prdCode"`
	IndividualQty  string `json:"indQty"`
	SalePrice      string `json:"salePrice"`
	IndividualVat  string `json:"indVat"`
	IndividualIct  string `json:"indIct"`
	IndividualEdut string `json:"indEdut"`
	IndividualStr  string `json:"indStr"`
}

type ReturnMsg struct {
	Status   string `json:"status"`
	Result   string `json:"result"`
	DateTime string `json:"date"`
}

/*
* The Init method is called when the Smart Contract "tax refund" is instantiated by the blockchain network
* Best practice is to have any Ledger initialization in separate function -- see initLedger()
*/
func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

/*
* The Invoke method is called as a result of an application request to run the Smart Contract "tax refund"
* The calling application program has also specified the particular smart contract function to be called, with arguments
*/
func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {

	// Retrieve the requested Smart Contract function and arguments
	function, args := APIstub.GetFunctionAndParameters()
	// Route to the appropriate handler function to interact with the ledger appropriately
	if function == "getSingleTx" {
		return s.getTransactionReceiptByTxId(APIstub, args)
	} else if function == "getReferTx" {
		return s.getReferenceTransactionReceiptsByTxId(APIstub, args)
	} else if function == "initLedger" {
		return s.Init(APIstub)
	} else if function == "getTxByUserId" {
		return s.getTransactionByUserId(APIstub, args)
	} else if function == "invokePending" {
		return s.invokePendingTx(APIstub, args)
	} else if function == "invokeAuthByCustomsTx" {
		return s.invokeAuthByCustomsTx(APIstub, args)
	} else if function == "invokeExportTx" {
		return s.invokeExportTx(APIstub, args)
	} else if function == "invokeAskForRefundTx" {
		return s.invokeAskForRefundTx(APIstub, args)
	} else if function == "revokeTxRequest" {
		return s.revokeTxRequest(APIstub, args)
	} else if function == "revokeTxComplete" {
		return s.revokeTxComplete(APIstub, args)
	} else if function == "getAllTx" {
		return s.getAllTransactions(APIstub, args)
	}

	return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) getTransactionReceiptByTxId(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	queryKey := fmt.Sprintf("{\"selector\":{\"header\":{\"cur_tx_id\":\"%s\"}}}", args[0])

	resultsIterator, err := APIstub.GetQueryResult(queryKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryRecords
	var buffer bytes.Buffer
	buffer.WriteString("[")


	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")
		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")
	fmt.Printf("- getQueryResultForSpecificKey queryResult:\n%s\n", buffer.String())
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	response := &ReturnMsg{Status: "200", Result: buffer.String(), DateTime: fmt.Sprintf("%s", now)}
	result, err := json.Marshal(response)
	return shim.Success([]byte(result))
}

func (s *SmartContract) getReferenceTransactionReceiptsByTxId(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	queryKey := fmt.Sprintf("{\"selector\":{\"header\":{\"reference_id\":\"%s\"}}}", args[0])

	resultsIterator, err := APIstub.GetQueryResult(queryKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryRecords
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")
		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")
	fmt.Printf("- getQueryResultForSpecificKey queryResult:\n%s\n", buffer.String())
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	response := &ReturnMsg{Status: "200", Result: buffer.String(), DateTime: fmt.Sprintf("%s", now)}
	result, err := json.Marshal(response)
	return shim.Success([]byte(result))

}


func (s *SmartContract) initLedger(APIstub shim.ChaincodeStubInterface) sc.Response {

	return shim.Success(nil)
}

func (s *SmartContract) invokePendingTx(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	var request TaxRefundTXReceipt
	requestData := []byte(args[1])
	err := json.Unmarshal(requestData, &request)
	result, err := json.Marshal(request)
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	if err != nil {
		response := &ReturnMsg{Status: "500", Result: "Incorrect value of request arguments", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else if args[0] != "Client.store" {
		response := &ReturnMsg{Status: "400", Result: "The sender is not qualified role to propose a transaction", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else {
		key := fmt.Sprintf("TR-%d", index)
		APIstub.PutState(key, result)
		response := &ReturnMsg{Status: "200", Result: fmt.Sprintf("%s", request), DateTime: fmt.Sprintf("%s", now)}
		fmt.Println("Create Transaction Successfully: ", response)
		index = index + 1
		return shim.Success([]byte(fmt.Sprintf("%s", response)))
	}
}

func (s *SmartContract) invokeAuthByCustomsTx(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	var request TaxRefundTXReceipt
	requestData := []byte(args[1])
	err := json.Unmarshal(requestData, &request)
	result, err := json.Marshal(request)
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	if err != nil {
		response := &ReturnMsg{Status: "500", Result: "Incorrect value of request arguments", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else if args[0] != "Client.customs" {
		response := &ReturnMsg{Status: "400", Result: "the sender is not qualified role to propose a transaction", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else {
		key := fmt.Sprintf("TR-%d", index)
		APIstub.PutState(key, result)
		response := &ReturnMsg{Status: "200", Result: fmt.Sprintf("%s", request), DateTime: fmt.Sprintf("%s", now)}
		fmt.Println("Create Transaction Successfully: ", response)
		index = index + 1
		return shim.Success([]byte(fmt.Sprintf("%s", response)))
	}

}

func (s *SmartContract) invokeExportTx(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	var request TaxRefundTXReceipt
	requestData := []byte(args[1])
	err := json.Unmarshal(requestData, &request)
	result, err := json.Marshal(request)
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	if err != nil {
		response := &ReturnMsg{Status: "500", Result: "Incorrect value of request arguments", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else if args[0] != "Client.customs" {
		response := &ReturnMsg{Status: "400", Result: "The sender is not qualified role to propose a transaction", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else {
		key := fmt.Sprintf("TR-%d", index)
		APIstub.PutState(key, result)
		response := &ReturnMsg{Status: "200", Result: fmt.Sprintf("%s", request), DateTime: fmt.Sprintf("%s", now)}
		fmt.Println("Create Transaction Successfully: ", response)
		index = index + 1
		return shim.Success([]byte(fmt.Sprintf("%s", response)))
	}
}

func (s *SmartContract) invokeAskForRefundTx(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	var request TaxRefundTXReceipt
	requestData := []byte(args[1])
	err := json.Unmarshal(requestData, &request)
	result, err := json.Marshal(request)
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	if err != nil {
		response := &ReturnMsg{Status: "500", Result: "Incorrect value of request arguments", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else if args[0] != "Client.customer" {
		response := &ReturnMsg{Status: "400", Result: "The sender is not qualified role to propose a transaction", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else {
		key := fmt.Sprintf("TR-%d", index)
		APIstub.PutState(key, result)
		response := &ReturnMsg{Status: "200", Result: fmt.Sprintf("%s", request), DateTime: fmt.Sprintf("%s", now)}
		fmt.Println("Create Transaction Successfully: ", response)
		index = index + 1
		return shim.Success([]byte(fmt.Sprintf("%s", response)))
	}
}

func (s *SmartContract) revokeTxRequest(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	var request TaxRefundTXReceipt
	requestData := []byte(args[1])
	err := json.Unmarshal(requestData, &request)
	result, err := json.Marshal(request)
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	if err != nil {
		response := &ReturnMsg{Status: "500", Result: "Incorrect value of request arguments", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else if args[0] != "Client.customer" {
		response := &ReturnMsg{Status: "400", Result: "The sender is not qualified role to propose a transaction", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else {
		key := fmt.Sprintf("TR-%d", index)
		APIstub.PutState(key, result)
		response := &ReturnMsg{Status: "200", Result: fmt.Sprintf("%s", request), DateTime: fmt.Sprintf("%s", now)}
		fmt.Println("Create Transaction Successfully: ", response)
		return shim.Success([]byte(fmt.Sprintf("%s", response)))
	}
}


func (s *SmartContract) revokeTxComplete(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	var request TaxRefundTXReceipt
	requestData := []byte(args[1])
	err := json.Unmarshal(requestData, &request)
	result, err := json.Marshal(request)
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	if err != nil {
		response := &ReturnMsg{Status: "500", Result: "Incorrect value of request arguments", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else if args[0] != "Client.customs" {
		response := &ReturnMsg{Status: "400", Result: "The sender is not qualified role to propose a transaction", DateTime: fmt.Sprintf("%s", now)}
		return shim.Error(fmt.Sprintf("%s", response))
	} else {
		key := fmt.Sprintf("TR-%d", index)
		APIstub.PutState(key, result)
		response := &ReturnMsg{Status: "200", Result: fmt.Sprintf("%s", request), DateTime: fmt.Sprintf("%s", now)}
		fmt.Println("Create Transaction Successfully: ", response)
		index = index + 1
		return shim.Success([]byte(fmt.Sprintf("%s", response)))
	}
}

func (s *SmartContract) getTransactionByUserId(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}
	if !isQualifiedRole(args[0]) {
		return shim.Error("Unqualified Role of arguments. Expect Specific Roles")
	}

	fmt.Printf("- getQueryResultForQueryString separated by Role queryString:\n%s\n", args[0])

	resultsIterator, err := APIstub.GetQueryResult(getQueryStatement(args[0], args[1]))
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryRecords
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")
		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")
	fmt.Printf("- getQueryResultForSpecificKey queryResult:\n%s\n", buffer.String())
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	response := &ReturnMsg{Status: "200", Result: buffer.String(), DateTime: fmt.Sprintf("%s", now)}
	result, err := json.Marshal(response)

	return shim.Success([]byte(result))

}

func isQualifiedRole(argRole string) bool {
	return argRole == "Client.customer" || argRole == "Client.store" || argRole == "Client.refunder"
}

func getQueryStatement(argRole string, argId string) string {
	queryKey := ""
	if argRole == "Client.customer" {
		queryKey = fmt.Sprintf("{\"selector\":{\"body\":{\"customer_id\":\"%s\"}}}", argId)
	} else if argRole == "Client.store" {
		queryKey = fmt.Sprintf("{\"selector\":{\"body\":{\"store_id\":\"%s\"}}}", argId)
	} else if argRole == "Client.refunder" {
		queryKey = fmt.Sprintf("{\"selector\":{\"body\":{\"taxRefunder_id\":\"%s\"}}}", argId)
	} else {
		queryKey = ""
	}

	return queryKey
}

func (s *SmartContract) getAllTransactions(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	startKey := args[1]
	endKey := args[2]

	if args[0] != "Client.customs" {
		return shim.Error("You are not authorized with scan this data")
	}
	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryResults
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")
		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")
	fmt.Printf("- getQueryResultForSpecificKey queryResult:\n%s\n", buffer.String())
	loc, _ := time.LoadLocation("Asia/Seoul")
	now := time.Now().In(loc)
	response := &ReturnMsg{Status: "200", Result: buffer.String(), DateTime: fmt.Sprintf("%s", now)}
	result, err := json.Marshal(response)
	return shim.Success([]byte(result))
}

func main() {

	// Create a new Smart Contract
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
