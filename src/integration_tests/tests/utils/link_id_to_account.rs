use candid::Principal;
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{constant::FEE_TREASURY_PRINCIPAL, utils::PocketIcTestContext};

// convert link id to account of current backend canister
pub fn link_id_to_account(ctx: &PocketIcTestContext, link_id: &str) -> Account {
    // Convert UUID string to bytes
    let link_uuid = Uuid::parse_str(link_id).expect("Invalid UUID format");
    let mut link_bytes = link_uuid.as_bytes().to_vec();

    // Add 16 zero bytes to make it 32 bytes total
    link_bytes.extend_from_slice(&[0u8; 16]);

    Account {
        owner: ctx.cashier_backend_principal,
        subaccount: Some(link_bytes.try_into().unwrap()),
    }
}

pub fn fee_treasury_account() -> Account {
    Account {
        owner: Principal::from_text(FEE_TREASURY_PRINCIPAL).unwrap(),
        subaccount: None,
    }
}
