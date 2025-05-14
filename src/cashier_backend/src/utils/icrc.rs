use candid::Principal;
use icrc_ledger_types::icrc1::account::Account;
use serde_bytes::ByteBuf;

use crate::services::ext::icrc_token::{Account as ExtAccount, Service};

pub async fn balance_of(token_pid: Principal, account: Account) -> Result<u64, String> {
    let account: ExtAccount = ExtAccount {
        owner: account.owner,
        subaccount: account.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
    };
    let token_service = Service(token_pid);

    let res = token_service.icrc_1_balance_of(&account).await;

    match res {
        Ok((balance,)) => Ok(balance.0.to_u64_digits().first().unwrap_or(&0).clone()),
        Err(error) => Err(format!("Error getting balance: {:?}", error)),
    }
}
