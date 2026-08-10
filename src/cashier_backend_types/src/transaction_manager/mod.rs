// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod graph;

pub use graph::Graph;

use crate::repository::transaction::v1::Transaction;

#[derive(Debug, Clone)]
pub struct ValidateActionTransactionsResult {
    pub wallet_transactions: Vec<Transaction>,
    pub canister_transactions: Vec<Transaction>,
    pub is_success: bool,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ExecuteTransactionsResult {
    pub transactions: Vec<Transaction>,
    pub is_success: bool,
    pub errors: Vec<String>,
}
