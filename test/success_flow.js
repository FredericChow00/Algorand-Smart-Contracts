const { Runtime, AccountStore, ERRORS } = require("@algo-builder/runtime");
const { assert, expect } = require("chai");
const algosdk = require("algosdk");
const commonfn = require("./commonfn/commonfn");

const mintApprovalFile = "mint_approval.py";
const mintClearStateFile = "mint_clearstate.py";
const holdingsApprovalFile = "holdings_approval.py";
const holdingsClearStateFile = "holdings_clearstate.py";
const burnApprovalFile = "burn_approval.py";
const burnClearStateFile = "burn_clearstate.py";

describe("Success Flow", function () {
    // Write your code here

    let creator;
    let buyer;
    let runtime;

    // do this before each tets
    this.beforeEach(async function() {
        creator = new AccountStore(100e6);
        buyer = new AccountStore(100e6);
        runtime = new Runtime([creator, buyer]);
    });

    const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);

    const initMintContract = () => {
        return commonfn.initMintContract(
            runtime, 
            creator.account,
            mintApprovalFile,
            mintClearStateFile
        )
    };

    const initHoldingsContract = (assetId) => {
        return commonfn.initHoldingsContract(
            runtime, 
            creator.account,
            holdingsApprovalFile,
            holdingsClearStateFile,
            assetId
        )
    };

    const initBurnContract = (assetId) => {
        return commonfn.initBurnContract(
            runtime, 
            creator.account,
            burnApprovalFile,
            burnClearStateFile,
            assetId
        )
    };

    it("Deploys mint contract successfully", () => {
        const appInfo = initMintContract();
        const appID = appInfo.appID;

        // verify app created 
        assert.isDefined(appID);
        assert.equal(getGlobal(appID, "Reserves"), 1000000);
        assert.equal(Buffer.from(getGlobal(appID, "AssetName"), "base64"), "NIL");
        
        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);
    });

    it("Minted asset successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const asset_id = Number(getGlobal(mintID, "AssetID"));    
        assert.equal(Buffer.from(getGlobal(mintID, "AssetName")), "Tesla");
        assert.equal(getGlobal(mintID, "AssetID"), asset_id);
    });

    it("Deploys holdings contract successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId = Number(getGlobal(mintID, "AssetID"));    
        const appInfo = initHoldingsContract(assetId);
        const appID = appInfo.appID;

        // verify app created 
        assert.isDefined(appID);
        assert.equal(getGlobal(appID, "CurrentPrice"), 5000000);
        assert.equal(getGlobal(appID, "AssetID"), assetId);
        
        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);
    });

    it("Deploys burn contract successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId= Number(getGlobal(mintID, "AssetID"));    
        const appInfo = initBurnContract(assetId);
        const appID = appInfo.appID;

        // verify app created 
        assert.isDefined(appID);
        assert.equal(getGlobal(appID, "AssetID"), assetId);
        
        // verify app funded
        const appAccount = runtime.getAccount(appInfo.applicationAccount);
        assert.equal(appAccount.amount, 2e7);
    });

    it("Registers holdings to mint successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId = Number(getGlobal(mintID, "AssetID"));  
        const holdingsInfo = initHoldingsContract(assetId);
        const holdingsAddress = holdingsInfo.applicationAccount;

        // verify holdings registered into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);
        const holdingsCont = algosdk.encodeAddress(Buffer.from(getGlobal(mintID, "HoldingsCont"), "base64"));
        assert.equal(holdingsCont, holdingsAddress);
    });

    it("Registers burn to mint successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId= Number(getGlobal(mintID, "AssetID"));  
        const burnInfo = initBurnContract(assetId);
        const burnAddress = burnInfo.applicationAccount;

        // verify holdings registered into mint contract
        commonfn.burnOptInToMint(runtime, creator.account, burnAddress, mintID);
        const burnCont = algosdk.encodeAddress(Buffer.from(getGlobal(mintID, "BurnCont"), "base64"));
        assert.equal(burnCont, burnAddress);
    });

    it("Opts holdings to asset successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId = Number(getGlobal(mintID, "AssetID"));  
        const holdingsInfo = initHoldingsContract(assetId);
        const holdingsID = holdingsInfo.appID;

        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // check that global state asset id is no longer 0
        assert.equal(getGlobal(holdingsID, "AssetID"), assetId);
    });

    it("Opts burn to mint successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId= Number(getGlobal(mintID, "AssetID"));  
        const burnInfo = initBurnContract(assetId);
        const burnID = burnInfo.appID;
        
        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, burnID);

        // check that global state asset id is no longer 0
        assert.equal(getGlobal(burnID, "AssetID"), assetId);
    });

    it("Transfers asset to holdings successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId = Number(getGlobal(mintID, "AssetID"));  
        const holdingsInfo = initHoldingsContract(assetId);
        const holdingsID = holdingsInfo.appID;
        const holdingsAddress = holdingsInfo.applicationAccount;

        const initialAmount = getGlobal(mintID, "Reserves");
        const amount = 800000;
        
        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // register holdings into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);

        // transfer assest to holdings
        commonfn.transfer(runtime, creator.account, holdingsAddress, assetId, mintID, amount);

        // verify transfer
        const currentAmount = getGlobal(mintID, "Reserves");
        assert.equal((initialAmount - currentAmount), amount);
        const asset = runtime.getAccount(holdingsAddress).assets.get(assetId).amount;
        console.log(asset);
        assert.equal(asset, amount);
    });

    it("Transfers asset to burn successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId= Number(getGlobal(mintID, "AssetID"));  
        const burnInfo = initBurnContract(assetId);
        const burnID = burnInfo.appID;
        const burnAddress = burnInfo.applicationAccount;

        const initialAmount = getGlobal(mintID, "Reserves");
        const amount = 100000; 

        // opts burn to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, burnID);

        // register burn into mint contract
        commonfn.burnOptInToMint(runtime, creator.account, burnAddress, mintID);
        
        // transfer assest to burn
        commonfn.burn(runtime, creator.account, burnAddress, assetId, mintID, amount);

        // verify transfer
        const currentAmount = getGlobal(mintID, "Reserves");
        assert.equal((initialAmount - currentAmount), amount);
        const asset = runtime.getAccount(burnAddress).assets.get(assetId).amount;
        assert.equal(asset, amount);
    });

    it("Updates price of asset successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId = Number(getGlobal(mintID, "AssetID"));  
        const holdingsInfo = initHoldingsContract(assetId);
        const holdingsID = holdingsInfo.appID;

        // update price on global state
        const newPrice = 6000000; // update price to 1 TSLA = 6 ALGOs
        commonfn.updatePrice(runtime, creator.account, holdingsID, newPrice);

        // verify update
        assert.equal((getGlobal(holdingsID, "CurrentPrice")), newPrice);
    });

    it("Sells asset to buyer successfully", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId = Number(getGlobal(mintID, "AssetID"));  
        const holdingsInfo = initHoldingsContract(assetId);
        const holdingsID = holdingsInfo.appID;
        const holdingsAddress = holdingsInfo.applicationAccount;

        const amount = 800000;
        const assetsSold = 1;
        const algosNeeded = assetsSold * Number(getGlobal(holdingsID, "CurrentPrice")) + 1000;

        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // register holdings into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);

        // transfer assest to holdings
        commonfn.transfer(runtime, creator.account, holdingsAddress, assetId, mintID, amount);

        // opts buyer into asset
        commonfn.buyerOptIn(runtime, buyer, assetId);

        // sells asset to buyer
        buyer = runtime.getAccount(buyer.address);
        console.log(buyer);
        commonfn.sellAsset(runtime, holdingsAddress, buyer, holdingsID, assetsSold, assetId, algosNeeded);
        holdings = runtime.getAccount(holdingsAddress);
        buyer = runtime.getAccount(buyer.address);
        holdingsAssets = holdings.assets.get(assetId).amount;
        buyerAssets = buyer.assets.get(assetId).amount;

        // verify sale
        console.log(holdingsAssets);
        console.log(buyerAssets);
        assert.equal(buyerAssets, assetsSold);
    });
});
