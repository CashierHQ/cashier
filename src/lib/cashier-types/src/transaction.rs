use cashier_macros::storable;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use crate::{common::Wallet, Asset};

#[derive(Debug, Clone)]
#[storable]
pub struct Transaction {
    pub id: String,
    pub created_at: u64,
    pub state: TransactionState,
    pub r#type: TransactionType,
    pub dependency: Vec<String>,
    pub grouping: String,
    pub wallet: TransactionWallet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransactionType {
    IcTransaction(IcTransaction),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcTransaction {
    pub protocol: TransactionProtocol,
    pub from: Wallet,
    pub to: Wallet,
    pub asset: Asset,
    pub amount: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum TransactionWallet {
    Canister,
    User,
}

impl TransactionWallet {
    pub fn to_str(&self) -> &str {
        match self {
            TransactionWallet::Canister => "Canister",
            TransactionWallet::User => "User",
        }
    }
}

impl FromStr for TransactionWallet {
    type Err = ();

    fn from_str(input: &str) -> Result<TransactionWallet, Self::Err> {
        match input {
            "Canister" => Ok(TransactionWallet::Canister),
            "User" => Ok(TransactionWallet::User),
            _ => Err(()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum TransactionState {
    Created,
    Processing,
    Success,
    Fail,
    Timeout,
}

impl TransactionState {
    pub fn to_str(&self) -> &str {
        match self {
            TransactionState::Created => "Transaction_state_created",
            TransactionState::Processing => "Transaction_state_processing",
            TransactionState::Success => "Transaction_state_success",
            TransactionState::Fail => "Transaction_state_fail",
            TransactionState::Timeout => "Transaction_state_timeout",
        }
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
            "Transaction_state_timeout" => Ok(TransactionState::Timeout),
            _ => Err(()),
        }
    }
}
