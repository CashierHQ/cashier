// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{CandidType, Nat};
use cashier_macros::storable;
use derive_more::Display;
use ic_mple_structures::Codec;
use icrc_ledger_types::{
    icrc1::{
        account::Account,
        transfer::{Memo, TransferArg},
    },
    icrc2::transfer_from::TransferFromArgs,
};
use serde::{Deserialize, Serialize};

use crate::repository::common::{Asset, Wallet};

#[derive(Debug, Clone, PartialEq, Eq)]
#[storable]
pub struct Transaction {
    pub id: String,
    pub created_at: u64,
    pub state: TransactionState,
    pub dependency: Option<Vec<String>>,
    pub group: u16,
    pub from_call_type: FromCallType,
    pub protocol: Protocol,
    pub start_ts: Option<u64>,
}

#[storable]
pub enum TransactionCodec {
    V1(Transaction),
}

impl Codec<Transaction> for TransactionCodec {
    fn decode(source: Self) -> Transaction {
        match source {
            TransactionCodec::V1(link) => link,
        }
    }

    fn encode(dest: Transaction) -> Self {
        TransactionCodec::V1(dest)
    }
}

impl Transaction {
    pub fn get_asset(&self) -> Asset {
        match &self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                icrc1_transfer.asset.clone()
            }
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => icrc2_approve.asset.clone(),
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.asset.clone()
            }
        }
    }

    pub fn get_from_account(&self) -> Account {
        match &self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                icrc1_transfer.from.clone().get_account()
            }
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => {
                icrc2_approve.from.clone().get_account()
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.from.clone().get_account()
            }
        }
    }

    pub fn set_from(&mut self, from_account: Account) {
        match &mut self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                icrc1_transfer.from = from_account.into()
            }
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => {
                icrc2_approve.from = from_account.into()
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.from = from_account.into()
            }
        }
    }

    pub fn set_to(&mut self, to_account: Account) {
        match &mut self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                icrc1_transfer.to = to_account.into()
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.to = to_account.into()
            }
            _ => {}
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub enum Protocol {
    IC(IcTransaction),
}

impl Protocol {
    pub fn as_ic_transaction(&self) -> Option<&IcTransaction> {
        match self {
            Protocol::IC(ic_transaction) => Some(ic_transaction),
            // none if other protocol
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub enum IcTransaction {
    Icrc1Transfer(Icrc1Transfer),
    Icrc2Approve(Icrc2Approve),
    Icrc2TransferFrom(Icrc2TransferFrom),
}

impl IcTransaction {
    pub fn as_icrc1_transfer(&self) -> Option<&Icrc1Transfer> {
        match self {
            IcTransaction::Icrc1Transfer(icrc1_transfer) => Some(icrc1_transfer),
            _ => None,
        }
    }

    pub fn as_icrc2_approve(&self) -> Option<&Icrc2Approve> {
        match self {
            IcTransaction::Icrc2Approve(icrc2_approve) => Some(icrc2_approve),
            _ => None,
        }
    }

    pub fn as_icrc2_transfer_from(&self) -> Option<&Icrc2TransferFrom> {
        match self {
            IcTransaction::Icrc2TransferFrom(icrc2_transfer_from) => Some(icrc2_transfer_from),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub struct Icrc1Transfer {
    pub from: Wallet,
    pub to: Wallet,
    pub asset: Asset,
    pub amount: Nat,
    pub memo: Option<Memo>,
    pub ts: Option<u64>,
}

impl TryFrom<Icrc1Transfer> for TransferArg {
    type Error = String;

    fn try_from(value: Icrc1Transfer) -> Result<Self, Self::Error> {
        let from = value.from.get_account();

        let to = value.to.get_account();

        let amount = value.amount;
        let memo = value.memo;

        Ok(TransferArg {
            from_subaccount: from.subaccount,
            to,
            amount,
            fee: None,
            memo,
            created_at_time: value.ts,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub struct Icrc2Approve {
    pub from: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    pub amount: Nat,
    pub memo: Option<Memo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, CandidType)]
pub struct Icrc2TransferFrom {
    pub from: Wallet,
    pub to: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    pub amount: Nat,
    pub memo: Option<Memo>,
    pub ts: Option<u64>,
}

impl TryFrom<Icrc2TransferFrom> for TransferFromArgs {
    type Error = String;

    fn try_from(value: Icrc2TransferFrom) -> Result<Self, Self::Error> {
        let spender_account = value.spender.get_account();

        let from = value.from.get_account();

        let to = value.to.get_account();

        let amount = value.amount;
        let memo = value.memo;

        Ok(TransferFromArgs {
            spender_subaccount: spender_account.subaccount,
            from,
            to,
            amount,
            fee: None,
            memo,
            created_at_time: None,
        })
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, CandidType, Eq, Display)]
pub enum FromCallType {
    Canister,
    Wallet,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, CandidType, Eq, Display)]
pub enum TransactionProtocol {
    Irrc1Transfer,
    Icrc2Approve,
    Icrc2TransferFrom,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, CandidType, Eq, Display)]
pub enum TransactionState {
    Created,
    Processing,
    Success,
    Fail,
}
