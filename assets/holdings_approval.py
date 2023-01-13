import sys
sys.path.insert(0,'.')

from algobpy.parse import parse_params
from pyteal import *

def holdings_approval():

    basic_checks = And(
        Txn.rekey_to() == Global.zero_address(),
        Txn.close_remainder_to() == Global.zero_address(),
        Txn.asset_close_to() == Global.zero_address(),
        Txn.fee() <= Int(1000)
    )

    asset_id = Txn.assets[0]
    handle_creation = Seq([
        App.globalPut(Bytes("AssetID"), asset_id),
        App.globalPut(Bytes("CurrentPrice"), Int(5000000)),
        Return(Int(1))
    ])

    # For this contract to opt in to the asset (TSLA)
    assetBalance = AssetHolding.balance(Global.current_application_address(), asset_id)
    asset_opt_in = Seq([
        assetBalance,
        Assert(asset_id == App.globalGet(Bytes("AssetID"))),
        Assert(assetBalance.hasValue() == Int(0)), # ensure that asset has not been opted in before
        Assert(Txn.sender() == Global.creator_address()),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
            TxnField.xfer_asset: asset_id
        }),
        InnerTxnBuilder.Submit(),
        App.globalPut(Bytes("AssetID"), asset_id),
        Return(Int(1))
    ])

    new_price = Btoi(Txn.application_args[1])
    update_price = Seq([
        Assert(Txn.sender() == Global.creator_address()),
        App.globalPut(Bytes("CurrentPrice"), new_price),
        Return(Int(1))
    ])

    coins_to_sell = Btoi(Gtxn[1].application_args[1]) # 2nd transation is asset transfer
    algos_needed = coins_to_sell * App.globalGet(Bytes("CurrentPrice")) + Int(1000)
    current_supply = AssetHolding.balance(Global.current_application_address(), asset_id)
    buyer_algos = Balance(Txn.sender())
    
    sell_tokens = Seq([
        Assert(asset_id == App.globalGet(Bytes("AssetID"))),
        Assert(Global.group_size() == Int(2)),
        Assert(algos_needed <= buyer_algos), # ensure sender has sufficient algos
        current_supply,
        Assert(current_supply.value() >= coins_to_sell),
        Assert(coins_to_sell > Int(0)), # ensure assets bought != 0
        Assert(Gtxn[0].amount() == algos_needed), # ensure that the sender sent the correct algos needed 
        InnerTxnBuilder.Begin(), 
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: Gtxn[1].sender(),
            TxnField.asset_amount: coins_to_sell,
            TxnField.xfer_asset: asset_id
        }),
        InnerTxnBuilder.Submit(),
        Return(Int(1))
    ])

    handle_noop = Seq(
        Cond(
            [Txn.application_args[0] == Bytes("Update"), update_price],
            [Txn.application_args[0] == Bytes("OptIn"), asset_opt_in],
            [Txn.application_args[0] == Bytes("Sell"), sell_tokens]
        )
    ) 

    handle_updateapp = Return(Int(0))
    handle_closeout = Return(Int(1))
    handle_deleteapp = Return(Int(0))
    handle_optin = Return(Int(1))

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

    print(compileTeal(holdings_approval(), mode=Mode.Application, version=6))