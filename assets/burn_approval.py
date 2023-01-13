import sys
sys.path.insert(0,'.')

from algobpy.parse import parse_params
from pyteal import *

def burn_approval():
    
    basic_checks = And(
        Txn.rekey_to() == Global.zero_address(),
        Txn.close_remainder_to() == Global.zero_address(),
        Txn.asset_close_to() == Global.zero_address(),
        Txn.fee() <= Int(1000)
    )

    asset_id = Txn.assets[0]
    handle_creation = Seq([
        App.globalPut(Bytes("AssetID"), asset_id),
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

    handle_optin = Return(Int(0))
    handle_updateapp = Return(Int(0))
    handle_closeout = Return(Int(1))
    handle_deleteapp = Return(Int(0))
    
    handle_noop = Seq(
        Cond(
            [Txn.application_args[0] == Bytes("OptIn"), asset_opt_in],
        )
    ) 

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

    print(compileTeal(burn_approval(), mode=Mode.Application, version=6))