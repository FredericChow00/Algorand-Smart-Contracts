const { convert } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

const initMintContract = (runtime, creatorAccount, approvalFile, clearStateFile) => {
    // deploy mint contract 
    runtime.deployApp(
        approvalFile,
        clearStateFile,
        {
            sender: creatorAccount,
            localInts: 0,
            localBytes: 0,
            globalInts: 2,
            globalBytes: 3,
        },
        { totalFee: 1000 }, //pay flags
        {} // smart contract template params 
    );

    const appInfo = runtime.getAppInfoFromName(approvalFile, clearStateFile);
    const appAddress = appInfo.applicationAccount;

    // fund the contract
    runtime.executeTx({
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: creatorAccount,
        toAccountAddr: appAddress,
        amountMicroAlgos: 2e7, // fund 20 algos
        payFlags: { totalFee: 1000 },
    });

    return appInfo;
}

const mintAssets = (runtime, creatorAccount, mintAppId) => {
    // mint TSLA asset to create the asset 
    const mintArgs = ["Mint"].map(convert.stringToBytes);
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: creatorAccount,
        appID: mintAppId,
        payFlags: { totalFee: 1000 },
        appArgs: mintArgs
    });
}

const initHoldingsContract = (runtime, creatorAccount, approvalFile, clearStateFile, assetId) => {
    // deploy mint contract
    runtime.deployApp(
        approvalFile,
        clearStateFile,
        {
            sender: creatorAccount,
            localInts: 0,
            localBytes: 0,
            globalInts: 2,
            globalBytes: 0,
            foreignAssets: [assetId]
        },
        { totalFee: 1000 }, //pay flags
        {} // smart contract template params 
    );

    const appInfo = runtime.getAppInfoFromName(approvalFile, clearStateFile);
    const appAddress = appInfo.applicationAccount;

    // fund the contract
    runtime.executeTx({
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: creatorAccount,
        toAccountAddr: appAddress,
        amountMicroAlgos: 2e7, // fund 20 algos
        payFlags: { totalFee: 1000 },
    });

    return appInfo;
}

const initBurnContract = (runtime, creatorAccount, approvalFile, clearStateFile, assetId) => {
    // deploy mint contract
    runtime.deployApp(
        approvalFile,
        clearStateFile,
        {
            sender: creatorAccount,
            localInts: 0,
            localBytes: 0,
            globalInts: 1,
            globalBytes: 0,
            foreignAssets: [assetId]
        },
        { totalFee: 1000 }, //pay flags
        {} // smart contract template params 
    );

    const appInfo = runtime.getAppInfoFromName(approvalFile, clearStateFile);
    const appAddress = appInfo.applicationAccount;

    // fund the contract
    runtime.executeTx({
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: creatorAccount,
        toAccountAddr: appAddress,
        amountMicroAlgos: 2e7, // fund 20 algos
        payFlags: { totalFee: 1000 },
    });

    return appInfo;
}

const holdingsOptInToMint = (runtime, creator, holdingAddress, mintAppID) => {
    const holdingsRegArgs = ["RegHoldings"].map(convert.stringToBytes)
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: creator,
        appID: mintAppID,
        payFlags: { totalFee: 1000 },
        appArgs: holdingsRegArgs,
        accounts: [holdingAddress],
    });
}

const burnOptInToMint = (runtime, creator, burnAddress, mintAppID) => {
    const burnRegArgs = ["RegBurn"].map(convert.stringToBytes)
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: creator,
        appID: mintAppID,
        payFlags: { totalFee: 1000 },
        appArgs: burnRegArgs,
        accounts: [burnAddress],
    });
}

const optInToAsset = (runtime, creator, asset_id, appID) => {
    const optInArgs = ["OptIn"].map(convert.stringToBytes)
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: creator,
        appID: appID,
        payFlags: { totalFee: 1000 },
        appArgs: optInArgs,
        foreignAssets: [asset_id]
    });
}

const transfer = (runtime, creator, holdingsAddress, asset_id, mintAppID, amount) => {
    const transferAppArgs = [convert.stringToBytes("Transfer"), convert.uint64ToBigEndian(amount)];
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: creator,
        appID: mintAppID,
        payFlags: { totalFee: 1000 },
        appArgs: transferAppArgs,
        accounts: [holdingsAddress],
        foreignAssets: [asset_id],
    })
}

const burn = (runtime, creator, burnAddress, asset_id, mintAppID, amount) => {
    const burnAppArgs = [convert.stringToBytes("Burn"), convert.uint64ToBigEndian(amount)];
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: creator,
        appID: mintAppID,
        payFlags: { totalFee: 1000 },
        appArgs: burnAppArgs,
        accounts: [burnAddress],
        foreignAssets: [asset_id],
    })
}

const updatePrice = (runtime, creator, holdingsAppId, newPrice) => {
    const updatePriceArgs = [convert.stringToBytes("Update"), convert.uint64ToBigEndian(newPrice)] 
    return runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: creator,
        appID: holdingsAppId,
        payFlags: { totalFee: 1000 },
        appArgs: updatePriceArgs
    });
};

const buyerOptIn = (runtime, buyer, assetId) => {
    return runtime.executeTx({
        type: types.TransactionType.OptInASA,
        sign: types.SignType.SecretKey,
        fromAccount: buyer.account,
        assetID: assetId,
        payFlags: { totalFee: 1000 }
    });
};

const sellAsset = (runtime, holdingAddr, buyerAccStore, holdingsAppId, assetsSold, assetId, algosNeeded) => {
    console.log(`Assets sold: ${assetsSold}`);
    console.log(`AssetId: ${assetId}`);
    console.log(`AlgosNeeded: ${algosNeeded}`);

    const sellAssetArgs = [convert.stringToBytes("Sell"), convert.uint64ToBigEndian(assetsSold)];
    return runtime.executeTx([{
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: buyerAccStore.account,
        toAccountAddr: holdingAddr,
        amountMicroAlgos: algosNeeded,
        payFlags: { totalFee: 1000 },
    },
    {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: buyerAccStore.account,
        appID: holdingsAppId,
        payFlags: { totalFee: 1000 },
        appArgs: sellAssetArgs,
        foreignAssets: [assetId],
    }]);
};

const ungroupedTransferAlgo = (runtime, creatorAccStore, buyerAccStore, algosNeeded) => {
    return runtime.executeTx({
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: buyerAccStore.account,
        toAccountAddr: creatorAccStore.address,
        amountMicroAlgos: algosNeeded,
        payFlags: { totalFee: 1000 },
    });
};

const ungroupedSellAssets = (runtime, creatorAccStore, buyerAccStore, holdingsAppId, assetsSold, assetId) => {
    const sellAssetArgs = [convert.stringToBytes("Sell"), convert.uint64ToBigEndian(assetsSold)];
    console.log(assetsSold);
    return runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: creatorAccStore.account,
        toAccountAddr: buyerAccStore.address,
        appID: holdingsAppId,
        payFlags: { totalFee: 1000 },
        appArgs: sellAssetArgs,
        foreignAssets: [assetId],
        accounts: [buyerAccStore.address]
    });
};

module.exports = {
    initMintContract,
    mintAssets,
    initHoldingsContract,
    initBurnContract,
    holdingsOptInToMint,
    burnOptInToMint,
    optInToAsset,
    transfer,
    burn,
    updatePrice,
    buyerOptIn,
    sellAsset,
    ungroupedTransferAlgo,
    ungroupedSellAssets
}



