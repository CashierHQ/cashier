use candid::Nat;
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};
use uuid::Uuid;

use crate::{
    constant::ICP_CANISTER_ID,
    types::{link::link_type::LinkType, transaction::Transaction},
    utils::helper::{to_memo, to_subaccount},
};

#[derive(Clone, Copy)]
pub enum Fee {
    // 1_0000_0000 = 1 ICP
    // 100_000 = 0.001 ICP
    CreateTipLinkFeeIcp = 100_000,
}

impl Fee {
    fn as_u64(&self) -> u64 {
        *self as u64
    }
}

pub fn build_transfer_fee(link_type: &LinkType) -> Transaction {
    match link_type {
        LinkType::TipLink => {
            let id = Uuid::new_v4();
            let fee_wallet_account = Account {
                owner: ic_cdk::id(),
                subaccount: None,
            };

            let arg = TransferArg {
                to: fee_wallet_account,
                amount: Nat::from(Fee::CreateTipLinkFeeIcp.as_u64()),
                memo: Some(to_memo(id.to_string())),
                fee: None,
                created_at_time: None,
                from_subaccount: None,
            };

            Transaction::build_icrc_transfer(id.to_string(), ICP_CANISTER_ID.to_string(), arg)
        }
        LinkType::NftCreateAndAirdrop => todo!(),
    }
}

pub fn build_transfer_to_link_escrow_wallet(link_id: String, transfer_amount: u64) -> Transaction {
    let id: Uuid = Uuid::new_v4();

    let account = Account {
        owner: ic_cdk::id(),
        subaccount: Some(to_subaccount(link_id)),
    };

    let arg = TransferArg {
        to: account,
        amount: Nat::from(transfer_amount),
        memo: Some(to_memo(id.to_string())),
        fee: None,
        created_at_time: None,
        from_subaccount: None,
    };

    Transaction::build_icrc_transfer(id.to_string(), ICP_CANISTER_ID.to_string(), arg)
}
