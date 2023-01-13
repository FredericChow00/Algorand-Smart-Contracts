import sys
sys.path.insert(0,'.')

from algobpy.parse import parse_params
from pyteal import *

def mint_approval():

    basic_checks = And(
        Txn.rekey_to() == Global.zero_address(),
        Txn.close_remainder_to() == Global.zero_address(),
        Txn.asset_close_to() == Global.zero_address(),
        Txn.fee() <= Int(1000)
    )

    handle_creation = Seq([
        # Assert(Txn.sender() == Global.creator_address()), # ensure sender is creator 
        App.globalPut(Bytes("AssetName"), Bytes("NIL")), # default asset name  
        App.globalPut(Bytes("Reserves"), Int(1000000)),
        Return(Int(1))
    ])

    current_supply = App.globalGet(Bytes("Reserves"))
    
    mint_coins = Seq([
        Assert(App.globalGet(Bytes("AssetName")) == Bytes("NIL")), # ensure that this is the first and only time we are creating the asset
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetConfig,
            TxnField.config_asset_total: Int(1000000),
            TxnField.config_asset_decimals: Int(0),
            TxnField.config_asset_name: Bytes("Tesla"),
            TxnField.config_asset_unit_name: Bytes("TSLA"),
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("AssetName"), Bytes("Tesla")),
        App.globalPut(Bytes("AssetID"), InnerTxn.created_asset_id()),
        Return(Int(1))
    ])

    amount_to_transfer = Btoi(Txn.application_args[1])
    receiving_contract = Txn.accounts[1]
    asset_id = Txn.assets[0]
    reserves = App.globalGet(Bytes("Reserves"))

    transfer_coins = Seq([
        Assert(asset_id == App.globalGet(Bytes("AssetID"))),
        Assert(current_supply >= amount_to_transfer), # ensure supply is enough
        Assert(App.globalGet(Bytes("AssetName")) != Bytes("NIL")), # ensure that asset has already been created
        Assert(App.globalGet(Bytes("HoldingsCont")) == receiving_contract), # ensure contract is holdings contract
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: receiving_contract,
            TxnField.asset_amount: amount_to_transfer,
            TxnField.xfer_asset: asset_id
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("Reserves"), reserves - amount_to_transfer),
        Return(Int(1))
    ])

    burn_coins = Seq([
        Assert(asset_id == App.globalGet(Bytes("AssetID"))),
        Assert(current_supply >= amount_to_transfer), # ensure supply is enough
        Assert(App.globalGet(Bytes("AssetName")) != Bytes("NIL")), # ensure that asset has already been created
        Assert(App.globalGet(Bytes("BurnCont")) == receiving_contract), # ensure contract is holdings contract
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: receiving_contract,
            TxnField.asset_amount: amount_to_transfer,
            TxnField.xfer_asset: asset_id
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("Reserves"), reserves - amount_to_transfer),
        Return(Int(1))
    ])

    # register holdings contract in global state
    reg_holdings = Seq([
        App.globalPut(Bytes("HoldingsCont"), receiving_contract),
        Return(Int(1))
    ])

    # register burn contract in global state
    reg_burn = Seq([
        App.globalPut(Bytes("BurnCont"), receiving_contract),
        Return(Int(1))
    ])

    handle_noop = Seq(
        Assert(Global.group_size() == Int(1)), 
        Assert(Txn.application_id() != Int(0)), # ensure asset is created
        Assert(Txn.sender() == Global.creator_address()), # ensure sender is creator
        Cond(
            [Txn.application_args[0] == Bytes("Mint"), mint_coins],
            [Txn.application_args[0] == Bytes("Transfer"), transfer_coins],
            [Txn.application_args[0] == Bytes("Burn"), burn_coins],
            [Txn.application_args[0] == Bytes("RegHoldings"), reg_holdings],
            [Txn.application_args[0] == Bytes("RegBurn"), reg_burn],
        )
    )

    # for holder and burn account to opt in to app
    handle_optin = Return(Int(0))
    handle_closeout = Return(Int(1))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    program = Seq([
        Assert(basic_checks == Int(1)),
        Cond(
            [Txn.application_id() == Int(0), handle_creation],
            [Txn.on_completion() == OnComplete.OptIn, handle_optin],
            [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
            [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
            [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
            [Txn.on_completion() == OnComplete.NoOp, handle_noop]
        )
    ])

    return program

if __name__ == "__main__":
    params = {}

    # Overwrite params if sys.argv[1] is passed
    if(len(sys.argv) > 1):
        params = parse_params(sys.argv[1], params)

    print(compileTeal(mint_approval(), mode=Mode.Application, version=6))