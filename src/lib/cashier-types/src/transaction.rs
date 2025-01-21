use serde::{Deserialize, Serialize};

use crate::common::Wallet;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Transaction {
    pub id: String,
    pub wallet: TransactionWallet,
    pub protocol: TransactionProtocol,
    pub from: Wallet,
    pub to: Wallet,
    pub asset: String,
    pub amount: u64,
    pub state: TransactionState,
    pub dependency: Vec<String>, // Array of intent IDs
    pub grouping: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum TransactionWallet {
    Canister,
    User,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum TransactionProtocol {
    Irrc1Transfer,
    Icrc2Approve,
    Icrc2TransferFrom,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum TransactionState {
    Created,
    Processing,
    Success,
    Fail,
    Timeout,
}
