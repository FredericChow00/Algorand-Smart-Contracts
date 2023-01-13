const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");
const burn = require("./actions/burn");

async function run(runtimeEnv, deployer) {
    // write your code here

    const master = deployer.accountsByName.get("master");
    const mintApprovalFile = "mint_approval.py";
    const mintClearStateFile = "mint_clearstate.py";
    const holdingsApprovalFile = "holdings_approval.py";
    const holdingsClearStateFile = "holdings_clearstate.py";
    const burnApprovalFile = "burn_approval.py";
    const burnClearStateFile = "burn_clearstate.py";

    // deploy mint contract
    await deployer.deployApp(
        mintApprovalFile,
        mintClearStateFile,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 2, // Reserves, AssetID
            globalBytes: 3, // AssetName, HoldingsCont, BurnCont
        },
        { totalFee: 1000 }
    );

    // get mint info
    const mintApp = deployer.getApp(mintApprovalFile, mintClearStateFile);
    const mintAppAddress = mintApp.applicationAccount;
    console.log("Mint app account address:", mintAppAddress);

    // fund account with 20 algos
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: mintAppAddress,
        amountMicroAlgos: 5e7, // 50 algos
        payFlags: { totalFee: 1000 },
    });

    // mint TSLA asset to create the asset 
    const mintArgs = ["Mint"].map(convert.stringToBytes)
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintApp.appID,
        payFlags: { totalFee: 1000 },
        appArgs: mintArgs
    })

    asset_id = (await readAppGlobalState(deployer, master.addr, mintApp.appID)).get("AssetID")
    console.log(`Asset ID: ${asset_id}`);

    // deploy holdings contract
    await deployer.deployApp(
        holdingsApprovalFile,
        holdingsClearStateFile,
        {
            sender: master,
            localInts: 0, 
            localBytes: 0,
            globalInts: 2, // CurrentPrice, AssetID
            globalBytes: 0,  
            foreignAssets: [asset_id]
        },
        { totalFee: 1000 }
    );

    // get holdings info
    const holdingsApp = deployer.getApp(holdingsApprovalFile, holdingsClearStateFile);
    const holdingsAppAddress = holdingsApp.applicationAccount;
    console.log("Holdings app account address:", holdingsAppAddress);
    await deployer.addCheckpointKV("holdingsAppID", holdingsApp.appID);
    await deployer.addCheckpointKV("holdingsAppAddress", holdingsAppAddress);

    // fund account with 50 algos
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: holdingsAppAddress,
        amountMicroAlgos: 5e7, // 50 algos
        payFlags: { totalFee: 1000 },
    });

    // deploy burn contract
    await deployer.deployApp(
        burnApprovalFile,
        burnClearStateFile,
        {
            sender: master,
            localInts: 0, 
            localBytes: 0,
            globalInts: 1, // AssetID 
            globalBytes: 0, 
            foreignAssets: [asset_id]
        },
        { totalFee: 1000 }
    );

    // get burn info
    const burnApp = deployer.getApp(burnApprovalFile, burnClearStateFile);
    const burnAppAddress = burnApp.applicationAccount;
    console.log("Burn app account address:", burnAppAddress);

    // fund account with 50 algos
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: burnAppAddress,
        amountMicroAlgos: 5e7, // 50 algos
        payFlags: { totalFee: 1000 },
    });

    // register holdings and burn apps into mint contract
    const holdingsRegArgs = ["RegHoldings"].map(convert.stringToBytes)
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintApp.appID,
        payFlags: { totalFee: 1000 },
        appArgs: holdingsRegArgs,
        accounts: [holdingsAppAddress],
    })

    const burnRegArgs = ["RegBurn"].map(convert.stringToBytes)
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintApp.appID,
        payFlags: { totalFee: 1000 },
        appArgs: burnRegArgs,
        accounts: [burnAppAddress],
    })

    // opt in holdings and burn contracts into asset
    const optInArgs = ["OptIn"].map(convert.stringToBytes)
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: holdingsApp.appID,
        payFlags: { totalFee: 1000 },
        appArgs: optInArgs,
        foreignAssets: [asset_id]
    }) 

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: burnApp.appID,
        payFlags: { totalFee: 1000 },
        appArgs: optInArgs,
        foreignAssets: [asset_id]
    }) 
}

module.exports = { default: run };

