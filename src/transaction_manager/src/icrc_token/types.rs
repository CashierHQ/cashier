// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{self, CandidType, Deserialize, Principal};
use cashier_backend_types::repository::common::Wallet;

pub type SubAccount = serde_bytes::ByteBuf;

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<SubAccount>,
}

impl From<Principal> for Account {
    fn from(owner: Principal) -> Self {
        Account {
            owner,
            subaccount: None,
        }
    }
}

impl From<Wallet> for Account {
    fn from(wallet: Wallet) -> Self {
        match wallet {
            Wallet::IC {
                address,
                subaccount,
            } => Account {
                owner: address,
                subaccount: subaccount.map(|s| serde_bytes::ByteBuf::from(s.to_vec())),
            },
        }
    }
}

pub type Icrc1Tokens = candid::Nat;

pub type Icrc1Timestamp = u64;

#[derive(CandidType, Deserialize, Debug)]
pub struct TransferArg {
    pub to: Account,
    pub fee: Option<Icrc1Tokens>,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub from_subaccount: Option<SubAccount>,
    pub created_at_time: Option<Icrc1Timestamp>,
    pub amount: Icrc1Tokens,
}

pub type Icrc1BlockIndex = candid::Nat;

#[derive(CandidType, Deserialize, Debug)]
pub enum Icrc1TransferError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    BadBurn {
        min_burn_amount: Icrc1Tokens,
    },
    Duplicate {
        duplicate_of: Icrc1BlockIndex,
    },
    BadFee {
        expected_fee: Icrc1Tokens,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    InsufficientFunds {
        balance: Icrc1Tokens,
    },
}
pub type Icrc1TransferResult = std::result::Result<Icrc1BlockIndex, Icrc1TransferError>;

#[derive(CandidType, Deserialize, Debug)]
pub struct AllowanceArgs {
    pub account: Account,
    pub spender: Account,
}
#[derive(CandidType, Deserialize, Debug)]
pub struct Allowance {
    pub allowance: Icrc1Tokens,
    pub expires_at: Option<Icrc1Timestamp>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct TransferFromArgs {
    pub to: Account,
    pub fee: Option<Icrc1Tokens>,
    pub spender_subaccount: Option<SubAccount>,
    pub from: Account,
    pub memo: Option<serde_bytes::ByteBuf>,
    pub created_at_time: Option<Icrc1Timestamp>,
    pub amount: Icrc1Tokens,
}
#[derive(CandidType, Deserialize, Debug)]
pub enum TransferFromError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    InsufficientAllowance {
        allowance: Icrc1Tokens,
    },
    BadBurn {
        min_burn_amount: Icrc1Tokens,
    },
    Duplicate {
        duplicate_of: Icrc1BlockIndex,
    },
    BadFee {
        expected_fee: Icrc1Tokens,
    },
    CreatedInFuture {
        ledger_time: Icrc1Timestamp,
    },
    TooOld,
    InsufficientFunds {
        balance: Icrc1Tokens,
    },
}
pub type TransferFromResult = std::result::Result<Icrc1BlockIndex, TransferFromError>;
