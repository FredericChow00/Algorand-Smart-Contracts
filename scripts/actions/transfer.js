const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here

    const master = deployer.accountsByName.get("master");
    const mintApprovalFile = "mint_approval.py";
    const mintClearStateFile = "mint_clearstate.py";
    const holdingsApprovalFile = "holdings_approval.py";
    const holdingsClearStateFile = "holdings_clearstate.py";

    // get mint info
    const mintApp = deployer.getApp(mintApprovalFile, mintClearStateFile);
    const mintAppID = mintApp.appID

    // get holdings info
    const holdingsApp = deployer.getApp(holdingsApprovalFile, holdingsClearStateFile);
    const holdingsAppID =  holdingsApp.appID;
    const holdingsAppAddress = holdingsApp.applicationAccount;


    // get initial global state of mint app
    let mintGlobalState = await readAppGlobalState(deployer, master.addr, mintAppID)
    console.log(mintGlobalState)

    asset_id = (await readAppGlobalState(deployer, master.addr, mintApp.appID)).get("AssetID")

    // transfer TSLA coins
    const transferAppArgs = [convert.stringToBytes("Transfer"), convert.uint64ToBigEndian(800000)];
    
    console.log("Transferring TSLA coins to holdings acc...")
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintAppID,
        payFlags: { totalFee: 1000 },
        appArgs: transferAppArgs,
        accounts: [holdingsAppAddress],
        foreignAssets: [asset_id],
    });
    let holdingsAccount = await deployer.algodClient.accountInformation(holdingsAppAddress).do();
    console.log(holdingsAccount);

    // get updated global and local state
    mintGlobalState = await readAppGlobalState(deployer, master.addr, mintAppID);
    console.log(mintGlobalState);
    let holdingsGlobalState = await readAppGlobalState(deployer, master.addr, holdingsAppID);
    console.log(holdingsGlobalState);
}

module.exports = { default: run };
