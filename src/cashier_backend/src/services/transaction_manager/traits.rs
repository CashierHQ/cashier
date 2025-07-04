//! TransactionManagerService trait decomposition
//!
//! This file declares small, focused traits that together cover all
//! behaviours currently implemented by `TransactionManagerService`.
//! They are introduced to improve testability and modularity.  Each
//! trait groups a coherent set of responsibilities and can be
//! implemented (or mocked) independently.

use async_trait::async_trait;
use candid::Principal;
use cashier_types::{
    common::Chain,
    intent::v2::Intent,
    transaction::v2::{
        Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Transaction, TransactionState,
    },
};
use icrc_ledger_types::icrc1::account::Account;

use crate::{
    core::action::types::ActionDto,
    types::{
        error::CanisterError, icrc_112_transaction::Icrc112Requests, temp_action::TemporaryAction,
        transaction_manager::UpdateActionArgs,
    },
    utils::runtime::IcEnvironment,
};

// ---------- 1. Intent → Transaction assembly ----------
/// Takes an Intent and produces chain-specific Transactions.
pub trait TransactionAssembler<E: IcEnvironment + Clone> {
    fn assemble_txs(
        &self,
        chain: &Chain,
        intent: &Intent,
    ) -> Result<Vec<Transaction>, CanisterError>;
}

// ---------- 2. Action creation ----------
/// Persists a TemporaryAction (and its transactions) into storage.
pub trait ActionCreator<E: IcEnvironment + Clone> {
    fn create_action(&self, temp: &mut TemporaryAction) -> Result<ActionDto, CanisterError>;
}

// ---------- 3. Transaction execution ----------
#[async_trait(?Send)]
pub trait TransactionExecutor<E: IcEnvironment + Clone> {
    async fn execute_tx_by_id(&self, tx_id: String) -> Result<(), CanisterError>;
    async fn execute_canister_tx(&self, tx: &mut Transaction) -> Result<(), CanisterError>;
    async fn execute_icrc1_transfer(&self, tx: &Icrc1Transfer) -> Result<(), CanisterError>;
    async fn execute_icrc2_transfer_from(
        &self,
        tx: &Icrc2TransferFrom,
    ) -> Result<(), CanisterError>;
}

// ---------- 4. Transaction validation & manual status ----------
#[async_trait(?Send)]
pub trait TransactionValidator<E: IcEnvironment + Clone> {
    async fn validate_balance_transfer(&self, tx: &Icrc1Transfer) -> Result<bool, CanisterError>;
    async fn validate_allowance(&self, tx: &Icrc2Approve) -> Result<bool, CanisterError>;
    async fn manual_check_status(
        &self,
        tx: &Transaction,
        all_txs: Vec<Transaction>,
    ) -> Result<TransactionState, CanisterError>;
    fn is_action_creator(&self, caller: &Principal, action_id: &str) -> Result<bool, String>;
}

// ---------- 5. Dependency analysis ----------
pub trait DependencyAnalyzer {
    fn has_dependency(&self, tx_id: &str) -> Result<bool, CanisterError>;
    fn is_group_has_dependency(&self, tx: &Transaction) -> Result<bool, CanisterError>;
}

// ---------- 6. Timeout handling ----------
#[async_trait(?Send)]
pub trait TimeoutHandler<E: IcEnvironment + Clone> {
    fn spawn_tx_timeout_task(&self, tx_id: String) -> Result<(), String>;
    async fn tx_timeout_task(&self, tx_id: String) -> Result<(), CanisterError>;
}

// ---------- 7. High-level action updater ----------
#[async_trait(?Send)]
pub trait ActionUpdater<E: IcEnvironment + Clone> {
    async fn update_action(&self, args: UpdateActionArgs) -> Result<ActionDto, CanisterError>;

    fn update_tx_state(
        &self,
        tx: &mut Transaction,
        state: &TransactionState,
    ) -> Result<(), CanisterError>;

    fn create_icrc_112(
        &self,
        caller: &Account,
        action_id: &str,
        link_id: &str,
        txs: &Vec<Transaction>,
    ) -> Result<Option<Icrc112Requests>, CanisterError>;
}

// ---------- 8. Batch helpers ----------
#[async_trait(?Send)]
pub trait BatchExecutor<E: IcEnvironment + Clone> {
    async fn execute_canister_txs_batch(
        &self,
        txs: &mut [Transaction],
    ) -> Result<(), CanisterError>;

    async fn manual_check_status_batch(
        &self,
        txs: Vec<Transaction>,
        all_txs: Vec<Transaction>,
    ) -> Vec<(String, Result<TransactionState, CanisterError>)>;
}
