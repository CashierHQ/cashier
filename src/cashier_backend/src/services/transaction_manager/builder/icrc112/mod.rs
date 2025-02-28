use crate::types::icrc_112_transaction::Icrc112Request;

pub mod approve_cashier_fee;
pub mod transfer_to_link_escrow_wallet;
pub mod trigger_transaction;
pub mod update_action;

pub trait TransactionBuilder {
    fn build(&self) -> Icrc112Request;
}
