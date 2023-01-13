<template>
    <div id="buyasset" class="mb-5">
        <h3>Buy TESLA coin</h3>
        <p>You can only mint up to 1000 TESLA coins</p>
        <div
            v-if="this.acsTxId !== ''"
            class="alert alert-success"
            role="alert"
        >
            Txn Ref:
            <a :href="explorerURL" target="_blank">{{ this.acsTxId }}</a>
        </div>
        <p>TESLA coins left: {{ this.asset_left }}</p>
        <form
            action="#"
            @submit.prevent="handleBuyAsset"
        >
            <div class="mb-3">
                <label for="asset_amount" class="form-label"
                    >Buy amount</label
                >
                <input
                    type="number"
                    class="form-control"
                    id="asset_amount"
                    v-model="asset_amount"
                />
            </div>
            <button type="submit" class="btn btn-primary">Buy</button>
        </form>
    </div>
</template>

<script>
import * as helpers from '../helpers';
import asset from "../artifacts/mint_asset.js.cp.yaml";
import { getAlgodClient } from "../client.js";

export default {
    props: {
        connection: String,
        network: String,
        sender: String,
    },
    data() {
        const holdingsApp = asset.default.metadata.holdingsAppID;
        console.log(holdingsApp);
        const holdingsAddr = asset.default.metadata.holdingsAppAddress;
        console.log(holdingsAddr);

        return {
            acsTxId: "",
            asset_left: 0,
            asset_amount: 0,
            explorerURL: "",
            appAddr: holdingsAddr,
            appId: holdingsApp,
            creator: process.env.VUE_APP_CREATOR_ADDR
        };
    },
    methods: {
        async updateTxn(value) {
            this.acsTxId = value;
            this.explorerURL = helpers.getExplorerURL(this.acsTxId, this.network);
        },
        async handleBuyAsset() {
            // write code here
            let asset_id = (await (this.readGlobalState(this.appId, this.network))).get("AssetID");
            console.log(asset_id);
            let asset_price = (await (this.readGlobalState(this.appId, this.network))).get("CurrentPrice");
            console.log(asset_price)

            console.log("Opting Buyer into Asset...");
            await this.doAssetOptIn(this.sender, asset_id);
            console.log("Purchasing Asset...");
            const response = await helpers.purchaseAsset(
                this.appAddr,
                this.sender,
                this.appId, 
                asset_id,
                this.asset_amount,
                asset_price,
                this.network
            );

            if (response !== undefined) {
                this.acsTxId = response.txId;
                this.setExplorerURL(response.txId);
            }

            let asset_info = await helpers.getAccountAssetInfo(this.appAddr, asset_id);
            let assets_left = asset_info["asset-holding"].amount;
            console.log(assets_left);
            this.asset_left = assets_left;
        },
        async doAssetOptIn(receiver, assetId) {
            // clear notification
            this.acsTxId = "";

            // do asset opt in if receiver hasn't opted in to receive asset
            const receiverInfo = await helpers.getAccountInfo(
                receiver,
                this.network
            );
            const optedInAsset = receiverInfo.assets.find((asset) => {
                return asset["asset-id"] === assetId;
            });

            let optedIn = false;
            if (optedInAsset === undefined) {
                const optInResponse = await helpers.assetOptIn(
                    receiver,
                    assetId,
                    this.network
                );
                if (optInResponse.txId !== undefined) {
                    optedIn = true;
                }
            } else {
                optedIn = true;
            }

            if (!optedIn) {
                console.error("Receiver hasn't opted in to receive the asset.");
            }
        },

        async readGlobalState(appId, network) {
            const app = await getAlgodClient(network).getApplicationByID(appId).do();
            
            // global state is a key value array
            const globalState = app.params["global-state"];
            const formattedGlobalState = globalState.map(item => {
                // decode from base64 and utf8
                const formattedKey = decodeURIComponent(Buffer.from(item.key, "base64"));
            
                let formattedValue;
                if (item.value.type === 1) {
                    if (formattedKey === "voted") {
                    formattedValue = decodeURIComponent(Buffer.from(item.value.bytes, "base64"));
                    } else {
                    formattedValue = item.value.bytes;
                    }
                } else {
                    formattedValue = item.value.uint;
                }
                
                return {
                    key: formattedKey,
                    value: formattedValue
                }
            });
            let result = new Map(formattedGlobalState.map(i => [i.key, i.value]));

            console.log(result);
            return result;
        },

        setExplorerURL(txId) {
            switch (this.network) {
                case "TestNet":
                    this.explorerURL =
                        "https://testnet.algoexplorer.io/tx/" + txId;
                    break;
                default:
                    this.explorerURL =
                        "http://localhost:8980/v2/transactions/" +
                        txId +
                        "?pretty";
                    break;
            }
        },
    },

    async mounted() {
        console.log(this.appId);
        console.log(this.network);
        let asset_id = (await this.readGlobalState(this.appId, this.network)).get("AssetID");
        console.log(asset_id);
        let asset_info = await helpers.getAccountAssetInfo(this.appAddr, asset_id);
        let assets_left = asset_info["asset-holding"].amount;
        console.log(assets_left);
        this.asset_left = assets_left;
    }
};
</script>
