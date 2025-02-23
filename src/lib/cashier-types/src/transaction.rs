use cashier_macros::storable;
use icrc_ledger_types::icrc1::transfer::Memo;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::{common::Wallet, Asset};

#[derive(Debug, Clone)]
#[storable]
pub struct Transaction {
    pub id: String,
    pub created_at: u64,
    pub state: TransactionState,
    pub dependency: Option<Vec<String>>,
    pub group: Option<String>,
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
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Protocol {
    IC(IcTransaction),
}

impl Protocol {
    pub fn as_ic_transaction(&self) -> Option<&IcTransaction> {
        match self {
            Protocol::IC(ic_transaction) => Some(ic_transaction),
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
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Icrc1Transfer {
    pub from: Wallet,
    pub to: Wallet,
    pub asset: Asset,
    pub amount: u64,
    pub memo: Option<Memo>,
    pub ts: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Icrc2Approve {
    pub from: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    pub amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Icrc2TransferFrom {
    pub from: Wallet,
    pub to: Wallet,
    pub spender: Wallet,
    pub asset: Asset,
    pub amount: u64,
    pub memo: Option<Memo>,
    pub ts: Option<u64>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum FromCallType {
    Canister,
    Wallet,
}

impl FromCallType {
    pub fn to_str(&self) -> &str {
        match self {
            FromCallType::Canister => "Canister",
            FromCallType::Wallet => {
                "Wallet
            "
            }
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

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
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
