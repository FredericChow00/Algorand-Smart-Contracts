import algosdk from "algosdk";
import { getAlgodClient } from "./client.js";
import wallets from "./wallets.js";

const getExplorerURL = (txId, network) => {
    switch (network) {
        case "TestNet":
            return "https://testnet.algoexplorer.io/tx/" + txId;
        default:
            return "http://localhost:8980/v2/transactions/" + txId + "?pretty";
    }
}

const assetOptIn = async (receiver, assetId, network) => {
    console.log("Helpers' opt in function ... ")
    if (!(receiver && assetId)) {
        console.error("error", receiver, assetId);
        return;
    }

    const algodClient = getAlgodClient(network)
    const suggestedParams = await algodClient.getTransactionParams().do();

    // receiver opts in to asset
    let assetOptIn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        receiver,
        receiver,
        undefined,
        undefined,
        0,
        undefined,
        assetId,
        suggestedParams
    );
    return await wallets.sendAlgoSignerTransaction([assetOptIn], algodClient);
};

const purchaseAsset = async (holdings, receiver, holdingsId, assetId, assetAmount, assetPrice, network) => {
    const algodClient = getAlgodClient(network)

    const suggestedParams = await algodClient.getTransactionParams().do();
    const algosNeeded = assetPrice * assetAmount + 1000;

    // transfer algos to creator
    let algosTransfer = algosdk.makePaymentTxnWithSuggestedParams(
        receiver,
        holdings,
        algosNeeded,
        undefined,
        undefined,
        suggestedParams
    )
    console.log("DONE ALGO PAYMENT");

    // make app call to holdings contract
    let appArgs = [];
    appArgs.push(new Uint8Array(Buffer.from("Sell")));
    appArgs.push(algosdk.encodeUint64(Number(assetAmount)));
    let assetTransfer = algosdk.makeApplicationNoOpTxnFromObject({
        from: receiver,
        suggestedParams: suggestedParams,
        appIndex: holdingsId,
        appArgs: appArgs,
        foreignAssets: [assetId],
    });

    // Group transactions
    let txns = [algosTransfer, assetTransfer];

    return await wallets.sendAlgoSignerTransaction(txns, algodClient);
}

const getAccountInfo = async (address, network) => {
    const algodClient = getAlgodClient(network);
    console.log(address);
    return await algodClient.accountInformation(address).do();
};

const getAccountAssetInfo = async (address, assetId, network) => {
    const algodClient = getAlgodClient(network);

    return await algodClient.accountAssetInformation(address, assetId).do();
};

const currentSupply = async (address, assetId, network) => {
    const asset_info = getAccountAssetInfo(address, assetId, network);

    return await asset_info["asset-holding"].amount;
}

export {
    getExplorerURL,
    assetOptIn,
    purchaseAsset,
    getAccountInfo,
    getAccountAssetInfo,
    currentSupply
};
