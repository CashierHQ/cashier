// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use icrc_ledger_types::{
    icrc1::{account::Account, transfer::TransferArg},
    icrc2::transfer_from::TransferFromArgs,
};
use serde_bytes::ByteBuf;
use std::fmt;

use crate::{
    services::ext::icrc_token::{
        Account as ExtAccount, Allowance, AllowanceArgs, Service, TransferArg as ExtTransferArg,
        TransferFromArgs as ExtTransferFromArgs, TransferFromError,
    },
    types::error::CanisterError,
};

#[derive(Clone)]
pub struct IcrcService {}

impl Default for IcrcService {
    fn default() -> Self {
        Self::new()
    }
}

impl IcrcService {
    pub fn new() -> Self {
        Self {}
    }

    pub async fn fee(&self, token_pid: Principal) -> Result<Nat, CanisterError> {
        let token_service = Service::new(token_pid);

        token_service.icrc_1_fee().await
    }

    pub async fn balance_of(
        &self,
        token_pid: Principal,
        account: Account,
    ) -> Result<Nat, CanisterError> {
        let token_service = Service::new(token_pid);

        let account: ExtAccount = ExtAccount {
            owner: account.owner,
            subaccount: account.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
        };

        token_service.icrc_1_balance_of(&account).await
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

        let res = token_service.icrc_2_allowance(&arg).await?;

        Ok(res)
    }

    pub async fn transfer_from(
        &self,
        token_pid: Principal,
        arg: TransferFromArgs,
    ) -> Result<Nat, CanisterError> {
        let token_service = Service::new(token_pid);

        let memo = arg.memo.map(|m| m.0);

        let arg: ExtTransferFromArgs = ExtTransferFromArgs {
            to: ExtAccount {
                owner: arg.to.owner,
                subaccount: arg.to.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
            },
            from: ExtAccount {
                owner: arg.from.owner,
                subaccount: arg.from.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
            },
            amount: arg.amount,
            fee: arg.fee,
            spender_subaccount: arg
                .spender_subaccount
                .map(|sub| ByteBuf::from(sub.to_vec())),
            memo,
            created_at_time: arg.created_at_time,
        };
        let res = token_service.icrc_2_transfer_from(&arg).await?;

        match res {
            Ok(_block_id) => Ok(_block_id),
            Err(error) => match error {
                // likely a duplicate transfer, return the original transfer id
                TransferFromError::Duplicate { duplicate_of } => Ok(duplicate_of),
                _ => Err(CanisterError::CanisterCallError {
                    method: "icrc2_transfer_from".to_string(),
                    canister_id: token_service.get_canister_id().to_string(),
                    message: error.to_string(),
                }),
            },
        }
    }

    pub async fn transfer(
        &self,
        token_pid: Principal,
        arg: TransferArg,
    ) -> Result<Nat, CanisterError> {
        let token_service = Service::new(token_pid);

        let memo = arg.memo.map(|m| m.0);

        let transfer_arg = ExtTransferArg {
            to: ExtAccount {
                owner: arg.to.owner,
                subaccount: arg.to.subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
            },
            from_subaccount: arg.from_subaccount.map(|sub| ByteBuf::from(sub.to_vec())),
            amount: arg.amount,
            fee: arg.fee,
            memo,
            created_at_time: arg.created_at_time,
        };

        let res = token_service.icrc_1_transfer(&transfer_arg).await?;

        match res {
            Ok(_block_id) => Ok(_block_id),
            Err(error) => Err(CanisterError::CanisterCallError {
                method: "icrc1_transfer".to_string(),
                canister_id: token_service.get_canister_id().to_string(),
                message: format!("{error:?}"),
            }),
        }
    }
}

impl fmt::Display for TransferFromError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TransferFromError::GenericError {
                message,
                error_code,
            } => {
                write!(f, "GenericError: {message}, ErrorCode: {error_code}")
            }
            TransferFromError::TemporarilyUnavailable => {
                write!(f, "TemporarilyUnavailable")
            }
            TransferFromError::InsufficientAllowance { allowance } => {
                write!(f, "InsufficientAllowance: Allowance: {allowance}")
            }
            TransferFromError::BadBurn { min_burn_amount } => {
                write!(f, "BadBurn: MinBurnAmount: {min_burn_amount}")
            }
            TransferFromError::Duplicate { duplicate_of } => {
                write!(f, "Duplicate: DuplicateOf: {duplicate_of}")
            }
            TransferFromError::BadFee { expected_fee } => {
                write!(f, "BadFee: ExpectedFee: {expected_fee}")
            }
            TransferFromError::CreatedInFuture { ledger_time } => {
                write!(f, "CreatedInFuture: LedgerTime: {ledger_time}")
            }
            TransferFromError::TooOld => {
                write!(f, "TooOld")
            }
            TransferFromError::InsufficientFunds { balance } => {
                write!(f, "InsufficientFunds: Balance: {balance}")
            }
        }
    }
}

impl From<TransferFromError> for String {
    fn from(error: TransferFromError) -> Self {
        error.to_string()
    }
}
