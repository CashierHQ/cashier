use candid::Principal;
use icrc_ledger_types::icrc1::account::Account;
use serde_bytes::ByteBuf;

use crate::services::ext::icrc_token::{Account as ExtAccount, Allowance, AllowanceArgs, Service};

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

pub async fn allowance(
    token_pid: Principal,
    account: Account,
    spender: Account,
) -> Result<Allowance, String> {
    let account: ExtAccount = ExtAccount {
        owner: account.owner,
        subaccount: account.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
    };
    let token_service = Service(token_pid);

    let arg: AllowanceArgs = AllowanceArgs {
        account: ExtAccount {
            owner: account.owner,
            subaccount: account.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
        },
        spender: ExtAccount {
            owner: spender.owner,
            subaccount: spender.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
        },
    };

    let res = token_service.icrc_2_allowance(&arg).await;

    match res {
        Ok((allowance,)) => Ok(allowance),
        Err(error) => Err(format!("Error getting allowance: {:?}", error)),
    }
}
