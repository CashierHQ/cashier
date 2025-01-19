pub mod approve_cashier_fee;
pub mod transfer_to_link_escrow_wallet;
pub mod update_intent;
use crate::services::transaction_manager::build_tx::BuildTxResp;

pub trait TransactionBuilder {
    fn build(&self) -> BuildTxResp;
}
