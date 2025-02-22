use candid::Principal;
use icrc_ledger_types::icrc1::account::Account;
use serde_bytes::ByteBuf;

use crate::{
    services::ext::icrc_token::{Account as ExtAccount, Allowance, AllowanceArgs, Service},
    types::error::{CanisterError, DisplayRejectionCode},
};

#[cfg_attr(test, faux::create)]
pub struct IcrcService {}

#[cfg_attr(test, faux::methods)]
impl IcrcService {
    pub fn new() -> Self {
        Self {}
    }

    pub async fn balance_of(
        &self,
        token_pid: Principal,
        account: Account,
    ) -> Result<u64, CanisterError> {
        let token_service = Service::new(token_pid);

        let account: ExtAccount = ExtAccount {
            owner: account.owner,
            subaccount: account.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
        };

        let res = token_service.icrc_1_balance_of(&account).await;

        match res {
            Ok((balance,)) => Ok(balance.0.to_u64_digits().first().unwrap_or(&0).clone()),
            Err((code, error)) => Err(CanisterError::CanisterCallError(
                "icrc_1_balance_of".to_string(),
                token_service.get_canister_id().to_string(),
                DisplayRejectionCode(code),
                error,
            )),
        }
    }

    pub async fn allowance(
        &self,
        token_pid: Principal,
        account: Account,
        spender: Account,
    ) -> Result<Allowance, CanisterError> {
        let token_service = Service::new(token_pid);

        let account: ExtAccount = ExtAccount {
            owner: account.owner,
            subaccount: account.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
        };

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
            Err((code, error)) => Err(CanisterError::CanisterCallError(
                "icrc_2_allowance".to_string(),
                token_service.get_canister_id().to_string(),
                DisplayRejectionCode(code),
                error,
            )),
        }
    }
}
