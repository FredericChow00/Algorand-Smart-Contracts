import algosdk from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import MyAlgoConnect from "@randlabs/myalgo-connect";

// Contains a list of methods to send transactions via different wallet connectors

const sendAlgoSignerTransaction = async (txn, algodClient) => {
    const AlgoSigner = window.AlgoSigner;

    if (typeof AlgoSigner !== "undefined") {
        try {
            // Group all transactions
            algosdk.assignGroupID(txn);
            
            // Get the binary and base64 encode it
            let binaryTx = txn.map(tx => tx.toByte());
            let base64Tx = binaryTx.map(binary => AlgoSigner.encoding.msgpackToBase64(binary));
            let signedTxs;
            console.log(base64Tx);
            if (txn.length == 2) {
                signedTxs = await AlgoSigner.signTxn([
                    {
                        txn: base64Tx[0],
                    },
                    {
                        txn: base64Tx[1],
                    },
                ]);
            } else {
                signedTxs = await AlgoSigner.signTxn([
                    {
                        txn: base64Tx[0],
                    },
                ]);
            }

            console.log(signedTxs);

            // Get the base64 encoded signed transaction and convert it to binary
            let binarySignedTx = signedTxs.map(
                stxn => AlgoSigner.encoding.base64ToMsgpack(stxn.blob)
            );

            const response = await algodClient
                .sendRawTransaction(binarySignedTx)
                .do();
            console.log(response);

            await algosdk.waitForConfirmation(
                algodClient,
                response.txId,
                4
            );

            return response;
        } catch (err) {
            console.error(err);
            alert("Error!");
        }
    }
};

const sendWalletConnectTransaction = async (connector, txn, algodClient) => {
    try {
        // Sign transaction
        // txns is an array of algosdk.Transaction like below
        // i.e txns = [txn, ...someotherTxns], but we've only built one transaction in our case
        const txns = [txn];
        const txnsToSign = txns.map((txn) => {
            const encodedTxn = Buffer.from(
                algosdk.encodeUnsignedTransaction(txn)
            ).toString("base64");

            return {
                txn: encodedTxn,
                message: "Description of transaction being signed",
                // Note: if the transaction does not need to be signed (because it's part of an atomic group
                // that will be signed by another party), specify an empty singers array like so:
                // signers: [],
            };
        });

        const requestParams = [txnsToSign];

        const request = formatJsonRpcRequest("algo_signTxn", requestParams);
        const result = await connector.sendCustomRequest(request);
        const decodedResult = result.map((element) => {
            return element
                ? new Uint8Array(Buffer.from(element, "base64"))
                : null;
        });

        const response = await algodClient
            .sendRawTransaction(decodedResult)
            .do();
        console.log(response);

        return response;
    } catch (err) {
        console.error(err);
    }
};

const sendMyAlgoTransaction = async (txn, algodClient) => {
    try {
        const myAlgoWallet = new MyAlgoConnect();

        const signedTxn = await myAlgoWallet.signTransaction(txn.toByte());
        const response = await algodClient
            .sendRawTransaction(signedTxn.blob)
            .do();
        console.log(response);

        return response;
    } catch (err) {
        console.error(err);
    }
};

export default {
    sendWalletConnectTransaction,
    sendMyAlgoTransaction,
    sendAlgoSignerTransaction
};
