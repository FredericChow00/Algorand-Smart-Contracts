const { types } = require("@algo-builder/web");
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

const RUNTIME_ERR1009 = "RUNTIME_ERR1009: TEAL runtime encountered err opcode"; // rejected by logic

describe("Negative Tests", function () {
    // Write your code here

    let creator;
    let buyer;
    let runtime;

    // do this before each tets
    this.beforeEach(async function () {
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
        );
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
    
    it("Double asset creation fails", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;

        // mint asset 
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )

        const asset_id = getGlobal(mintID, "AssetID");    

        // mint asset again and throw error
        const errorMsg = `Asset ${asset_id} is already minted in app ${mintID}`;
        assert.throws(() => { commonfn.mintAssets(runtime, creator.account, mintID) }, RUNTIME_ERR1009);
    });

    it("Asset creation fails when non-creator calls", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;

        // mint asset with non-creator and throw error
        const errorMsg = `${buyer.account} is not the creator of app ${mintID} - cannot mint!`;
        assert.throws(() => { commonfn.mintAssets(runtime, buyer.account, mintID) }, RUNTIME_ERR1009);
    });

    it("Asset transfer fails when supply is insufficient", () => {
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

        console.log(assetId);    
        const amount = 1100000; // more than supply
        const supply = getGlobal(mintID, "Reserves");

        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // register holdings into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);

        // transfer assets to holdings with insufficient supply and throw error
        const errorMsg = `${amount} is over the current supply of ${supply} assets!`;
        assert.throw(() => { commonfn.transfer(runtime, creator.account, holdingsAddress, assetId, mintID, amount) }, RUNTIME_ERR1009);
    });

    it("Asset burn fails when supply is insufficient", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId = Number(getGlobal(mintID, "AssetID"));     
        const burnInfo = initBurnContract(assetId);
        const burnID = burnInfo.appID;
        const burnAddress = burnInfo.applicationAccount;

        const amount = 1100000; // more than supply
        const supply = getGlobal(mintID, "Reserves");

        // opts burn to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, burnID);

        // register burn into mint contract
        commonfn.burnOptInToMint(runtime, creator.account, burnAddress, mintID);

        // transfer assets to holdings with insufficient supply and throw error
        const errorMsg = `${amount} is over the current supply of ${supply} assets!`;
        assert.throw(() => { commonfn.burn(runtime, creator.account, burnAddress, assetId, mintID, amount) }, RUNTIME_ERR1009);
    });

    it("Asset transfer fails when non-creator calls", () => {
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

        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // register holdings into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);

        // transfer assets using non-creator and throw error
        const errorMsg = `${buyer.account} is not the creator of app ${mintID} - cannot transfer!`;
        assert.throw(() => { commonfn.transfer(runtime, buyer.account, holdingsAddress, assetId, mintID, amount) }, RUNTIME_ERR1009);
    });

    it("Asset burn fails when non-creator calls", () => {
        const mintInfo = initMintContract();
        const mintID = mintInfo.appID;
        commonfn.mintAssets(
            runtime,
            creator.account,
            mintID
        )
        const assetId = Number(getGlobal(mintID, "AssetID"));   
        const burnInfo = initBurnContract(assetId);
        const burnID = burnInfo.appID;
        const burnAddress = burnInfo.applicationAccount;
        const amount = 100000; 

        // opts burn to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, burnID);

        // register burn into mint contract
        commonfn.burnOptInToMint(runtime, creator.account, burnAddress, mintID);

        // burn assets using non-creator and throw error
        const errorMsg = `${buyer.account} is not the creator of app ${mintID} - cannot burn!`;
        assert.throw(() => { commonfn.burn(runtime, buyer.account, burnAddress, assetId, mintID, amount) }, RUNTIME_ERR1009);
    });

    it("Updating price of asset fails when not called by creator", () => {
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

        const newPrice = 6000000; // update price to 1 TSLA = 6 ALGOs

        // update price on global state using non-creator and throw error
        assert.throw(() => { commonfn.updatePrice(runtime, buyer.account, holdingsID, newPrice) }, RUNTIME_ERR1009);
    });

    it("Selling token fails when supply < amount sold", () => {
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
        const holdings = runtime.getAccount(holdingsAddress);

        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // register holdings into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);

        // transfer assest to holdings
        commonfn.transfer(runtime, creator.account, holdingsAddress, assetId, mintID, 2);

        // opts buyer into asset
        commonfn.buyerOptIn(runtime, buyer, assetId);

        const assetsSold = 5;
        const algosNeeded = assetsSold * Number(getGlobal(holdingsID, "CurrentPrice"));

        // sells asset to buyer and throws error since amount bought is more than supply
        assert.throw(() => { commonfn.sellAsset(runtime, holdingsAddress, buyer, holdingsID, assetsSold, assetId, algosNeeded) }, RUNTIME_ERR1009);
    });

    it("Selling tokens fails when transaction is not grouped", () => {
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

        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // register holdings into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);

        // transfer assest to holdings
        commonfn.transfer(runtime, creator.account, holdingsAddress, assetId, mintID, 800000);

        // opts buyer into asset
        commonfn.buyerOptIn(runtime, buyer, assetId);

        const assetsSold = 5;
        const algosNeeded = assetsSold * Number(getGlobal(holdingsID, "CurrentPrice"));

        // transfers algos to creator first
        commonfn.ungroupedTransferAlgo(runtime, creator, buyer, algosNeeded);

        // transfer assets to buyer but fails because not grouped
        assert.throw(() => { commonfn.ungroupedSellAssets(runtime, creator, buyer, holdingsID, assetsSold, assetId) }, RUNTIME_ERR1009);

    });

    it("Buying 0 token fails", () => {
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

        const assetsSold = 0;
        const algosNeeded = 0;

        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // register holdings into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);

        // transfer assest to holdings
        commonfn.transfer(runtime, creator.account, holdingsAddress, assetId, mintID, 800000);

        // opts buyer into asset
        commonfn.buyerOptIn(runtime, buyer, assetId);

        // sells asset to buyer and throws error since amount bought is more than supply
        const errorMsg = `Must buy more than ${assetsSold} assets!`;
        assert.throw(() => { commonfn.sellAsset(runtime, holdingsAddress, buyer, holdingsID, assetsSold, assetId, algosNeeded) }, RUNTIME_ERR1009);
    });

    it("Buying tokens with insufficient algo", () => {
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

        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // register holdings into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);

        // transfer assest to holdings
        commonfn.transfer(runtime, creator.account, holdingsAddress, assetId, mintID, 800000);

        // opts buyer into asset
        commonfn.buyerOptIn(runtime, buyer, assetId);

        const assetsSold = 50;
        console.log(Number(getGlobal(holdingsID, "CurrentPrice")));
        const algosNeeded = assetsSold * Number(getGlobal(holdingsID, "CurrentPrice"));
        console.log(algosNeeded);

        // sells asset to buyer and throws error since amount bought is more than supply
        const balance = Number(buyer.amount) - algosNeeded - 2000;
        console.log(balance);
        const RUNTIME_ERR1401 = `RUNTIME_ERR1401: account ${buyer.address} balance ${balance} below minimum required balance: 200000`
        assert.throw(() => { commonfn.sellAsset(runtime, holdingsAddress, buyer, holdingsID, assetsSold, assetId, algosNeeded) }, RUNTIME_ERR1401);
    });

    it("Transfer token to non holding app fails", () => {
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
        const burnInfo = initBurnContract(assetId);
        const burnAddress = burnInfo.applicationAccount;
        const amount = 800000; // more than supply

        // opts holdings to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, holdingsID);

        // register holdings into mint contract
        commonfn.holdingsOptInToMint(runtime, creator.account, holdingsAddress, mintID);

        // transfer assets to holdings with insufficient supply and throw error
        const errorMsg = `${burnAddress} is not a holding address!`;
        assert.throw(() => { commonfn.transfer(runtime, creator.account, burnAddress, assetId, mintID, amount) }, RUNTIME_ERR1009);
    });

    it("Burn token to non burn app fails", () => {
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
        const burnInfo = initBurnContract(assetId);
        const burnAddress = burnInfo.applicationAccount;
        const burnID = burnInfo.appID;
        const amount = 800000; // more than supply

        // opts burn to asset
        commonfn.optInToAsset(runtime, creator.account, assetId, burnID);

        // register burn into mint contract
        commonfn.burnOptInToMint(runtime, creator.account, burnAddress, mintID);

        // transfer assets to holdings with insufficient supply and throw error
        assert.throw(() => { commonfn.burn(runtime, creator.account, holdingsAddress, assetId, mintID, amount) }, RUNTIME_ERR1009);
    });
});

