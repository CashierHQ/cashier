use candid::Nat;
use cashier_types::Transaction;
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};
use uuid::Uuid;

use crate::{constant::ICP_CANISTER_ID, utils::helper::to_memo};

use super::fee::Fee;

pub struct BuildTxResp {
    pub transaction: Transaction,
}

pub fn build_transfer_cashier_fee(link_type: &LinkType) -> BuildTxResp {
    match link_type {
        LinkType::TipLink => {
            let id = Uuid::new_v4();
            let fee_wallet_account = Account {
                owner: ic_cdk::id(),
                subaccount: None,
            };

            let fee = Fee::CreateTipLinkFeeIcp.as_u64();
            let token_fee_address = ICP_CANISTER_ID.to_string();

            let arg = TransferArg {
                to: fee_wallet_account,
                amount: Nat::from(fee),
                memo: Some(to_memo(id.to_string())),
                fee: None,
                created_at_time: None,
                from_subaccount: None,
            };

            let consent = ConsentType::build_send_app_fee_consent(
                crate::types::chain::Chain::IC,
                fee,
                token_fee_address.clone(),
            );

            let transaction =
                Transaction::build_icrc_transfer(id.to_string(), token_fee_address, arg);

            return BuildTxResp {
                transaction,
                consent,
            };
        }
        LinkType::NftCreateAndAirdrop => todo!(),
    }
}
