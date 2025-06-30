// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Nat;
use cashier_macros::storable;
use icrc_ledger_types::{
    icrc1::{
        account::{Account, ICRC1TextReprError},
        transfer::{Memo, TransferArg},
    },
    icrc2::transfer_from::TransferFromArgs,
};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::common::{Asset, Chain, Wallet};

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

    pub fn get_tx_type(&self) -> String {
        match &self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(_)) => "Icrc1Transfer".to_string(),
            Protocol::IC(IcTransaction::Icrc2Approve(_)) => "Icrc2Approve".to_string(),
            Protocol::IC(IcTransaction::Icrc2TransferFrom(_)) => "Icrc2TransferFrom".to_string(),
        }
    }

    pub fn try_get_from_account(&self) -> Result<Account, ICRC1TextReprError> {
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
                icrc1_transfer.from = Wallet {
                    address: from_account.to_string(),
                    chain: Chain::IC,
                }
            }
            Protocol::IC(IcTransaction::Icrc2Approve(icrc2_approve)) => {
                icrc2_approve.from = Wallet {
                    address: from_account.to_string(),
                    chain: Chain::IC,
                }
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.from = Wallet {
                    address: from_account.to_string(),
                    chain: Chain::IC,
                }
            }
        }
    }

    pub fn set_to(&mut self, to_account: Account) {
        match &mut self.protocol {
            Protocol::IC(IcTransaction::Icrc1Transfer(icrc1_transfer)) => {
                icrc1_transfer.to = Wallet {
                    address: to_account.to_string(),
                    chain: Chain::IC,
                }
            }
            Protocol::IC(IcTransaction::Icrc2TransferFrom(icrc2_transfer_from)) => {
                icrc2_transfer_from.to = Wallet {
                    address: to_account.to_string(),
                    chain: Chain::IC,
                }
            }
            _ => {}
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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

    pub fn to_str(&self) -> &str {
        match self {
            IcTransaction::Icrc1Transfer(_) => "Icrc1Transfer",
            IcTransaction::Icrc2Approve(_) => "Icrc2Approve",
            IcTransaction::Icrc2TransferFrom(_) => "Icrc2TransferFrom",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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
        let from = value
            .from
            .get_account()
            .map_err(|e| format!("Failed to parse from account: {}", e))?;

        let to = value
            .to
            .get_account()
            .map_err(|e| format!("Failed to parse to account: {}", e))?;

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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Icrc2Approve {
    pub from: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    pub amount: Nat,
    pub memo: Option<Memo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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
        let spender_account = value
            .spender
            .get_account()
            .map_err(|e| format!("Failed to parse spender account: {}", e))?;

        let from = value
            .from
            .get_account()
            .map_err(|e| format!("Failed to parse from account: {}", e))?;

        let to = value
            .to
            .get_account()
            .map_err(|e| format!("Failed to parse to account: {}", e))?;

        let amount = value.amount;
        let memo = value.memo;

        Ok(TransferFromArgs {
            spender_subaccount: spender_account.subaccount,
            from,
            to,
            amount,
            fee: None,
            memo,
            created_at_time: value.ts,
        })
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum FromCallType {
    Canister,
    Wallet,
}

impl FromCallType {
    pub fn to_str(&self) -> &str {
        match self {
            FromCallType::Canister => "Canister",
            FromCallType::Wallet => "Wallet",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}

impl FromStr for FromCallType {
    type Err = ();

    fn from_str(input: &str) -> Result<FromCallType, Self::Err> {
        match input {
            "Canister" => Ok(FromCallType::Canister),
            "Wallet" => Ok(FromCallType::Wallet),
            _ => Err(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum TransactionProtocol {
    Irrc1Transfer,
    Icrc2Approve,
    Icrc2TransferFrom,
}

impl TransactionProtocol {
    pub fn to_str(&self) -> &str {
        match self {
            TransactionProtocol::Irrc1Transfer => "Irrc1Transfer",
            TransactionProtocol::Icrc2Approve => "Icrc2Approve",
            TransactionProtocol::Icrc2TransferFrom => "Icrc2TransferFrom",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}

impl FromStr for TransactionProtocol {
    type Err = ();

    fn from_str(input: &str) -> Result<TransactionProtocol, Self::Err> {
        match input {
            "Irrc1Transfer" => Ok(TransactionProtocol::Irrc1Transfer),
            "Icrc2Approve" => Ok(TransactionProtocol::Icrc2Approve),
            "Icrc2TransferFrom" => Ok(TransactionProtocol::Icrc2TransferFrom),
            _ => Err(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum TransactionState {
    Created,
    Processing,
    Success,
    Fail,
}

impl TransactionState {
    pub fn to_str(&self) -> &str {
        match self {
            TransactionState::Created => "Transaction_state_created",
            TransactionState::Processing => "Transaction_state_processing",
            TransactionState::Success => "Transaction_state_success",
            TransactionState::Fail => "Transaction_state_fail",
        }
    }

    pub fn to_string(&self) -> String {
        self.to_str().to_string()
    }
}

impl FromStr for TransactionState {
    type Err = ();

    fn from_str(input: &str) -> Result<TransactionState, Self::Err> {
        match input {
            "Transaction_state_created" => Ok(TransactionState::Created),
            "Transaction_state_processing" => Ok(TransactionState::Processing),
            "Transaction_state_success" => Ok(TransactionState::Success),
            "Transaction_state_fail" => Ok(TransactionState::Fail),
            _ => Err(()),
        }
    }
}
