const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    // write your code here

    const master = deployer.accountsByName.get("master");
    const holdingsApprovalFile = "holdings_approval.py";
    const holdingsClearStateFile = "holdings_clearstate.py";

    // get holdings info
    const holdingsApp = deployer.getApp(holdingsApprovalFile, holdingsClearStateFile);
    const holdingsAppId = holdingsApp.appID

    // get initial global state of holdings app
    let globalState = await readAppGlobalState(deployer, master.addr, holdingsAppId)
    console.log(globalState)

    // update price
    const updatePriceArgs = [convert.stringToBytes("Update"), convert.uint64ToBigEndian(6000000)] // update price to 1 TSLA = 6 ALGOs
    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: holdingsAppId,
        payFlags: { totalFee: 1000 },
        appArgs: updatePriceArgs
    });

    // get updated global and local state
    globalState = await readAppGlobalState(deployer, master.addr, holdingsAppId);
    console.log(globalState);
}

module.exports = { default: run };
