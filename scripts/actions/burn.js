const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here

    const master = deployer.accountsByName.get("master");
    const burnAcc = deployer.accountsByName.get("acc2");
    const mintApprovalFile = "mint_approval.py";
    const mintClearStateFile = "mint_clearstate.py";
    const burnApprovalFile = "burn_approval.py";
    const burnClearStateFile = "burn_clearstate.py";

    // get mint info
    const mintApp = deployer.getApp(mintApprovalFile, mintClearStateFile);
    const mintAppID = mintApp.appID
    
    // get burn info
    const burnApp = deployer.getApp(burnApprovalFile, burnClearStateFile);
    const burnAppID =  burnApp.appID;
    const burnAppAddress = burnApp.applicationAccount;

    // get initial global state of app 
    let mintGlobalState = await readAppGlobalState(deployer, master.addr, mintAppID)
    console.log(mintGlobalState)

    // transfer TSLA coins
    const burnAppArgs = [convert.stringToBytes("Burn"), convert.uint64ToBigEndian(100000)];
    asset_id = (await readAppGlobalState(deployer, master.addr, mintApp.appID)).get("AssetID")

    console.log("Transferring TSLA coins to burn acc...")
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintAppID,
        payFlags: { totalFee: 1000 },
        appArgs: burnAppArgs,
        accounts: [burnAppAddress],
        foreignAssets: [asset_id]
    });
    let burnAccount = await deployer.algodClient.accountInformation(burnAppAddress).do();
    console.log(burnAccount);

    // get updated global and local state
    mintGlobalState = await readAppGlobalState(deployer, master.addr, mintAppID);
    console.log(mintGlobalState);
    let burnGlobalState = await readAppGlobalState(deployer, master.addr, burnAppID);
    console.log(burnGlobalState);
}

module.exports = { default: run };
