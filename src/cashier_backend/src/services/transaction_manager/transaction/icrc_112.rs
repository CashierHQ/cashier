use cashier_types::{IcTransaction, Protocol, Transaction};

use crate::{
    services::transaction_manager::builder::icrc112::{
        approve_cashier_fee::ApproveCashierFeeBuilder,
        transfer_to_link_escrow_wallet::TransferToLinkEscrowWalletBuilder,
        update_action::UpdateActionBuilder, TransactionBuilder,
    },
    types::icrc_112_transaction::{Icrc112Requests, Icrc112RequestsBuilder},
};

pub fn create(
    link_id: String,
    action_id: String,
    client_txs: &Vec<&Transaction>,
) -> Icrc112Requests {
    let mut icrc_112_requests_builer = Icrc112RequestsBuilder::new();
    for tx in client_txs {
        match &tx.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(tx_transfer)) => {
                let builder = TransferToLinkEscrowWalletBuilder {
                    link_id: link_id.clone(),
                    token_address: tx_transfer.asset.address.clone(),
                    transfer_amount: tx_transfer.amount,
                    tx_id: tx.id.clone(),
                };

                let request = builder.build();

                icrc_112_requests_builer.add_to_first_group(request);
            }
            Protocol::IC(IcTransaction::Icrc2Approve(tx_approve)) => {
                let builder = ApproveCashierFeeBuilder {
                    token_address: tx_approve.asset.address.clone(),
                    fee_amount: tx_approve.amount,
                    tx_id: tx.id.clone(),
                };

                let request = builder.build();

                icrc_112_requests_builer.add_to_first_group(request);
            }
            _ => {}
        }
    }

    let builder = UpdateActionBuilder {
        link_id: link_id.clone(),
        action_id: action_id,
    };

    let request = builder.build();
    icrc_112_requests_builer.add_one_request(request);

    icrc_112_requests_builer.build()
}
