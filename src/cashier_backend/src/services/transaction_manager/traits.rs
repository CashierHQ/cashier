//! TransactionManagerService trait decomposition
//!
//! This file declares small, focused traits that together cover all
//! behaviours currently implemented by `TransactionManagerService`.
//! They are introduced to improve testability and modularity.  Each
//! trait groups a coherent set of responsibilities and can be
//! implemented (or mocked) independently.

use candid::Principal;
use cashier_backend_types::{
    dto::action::{ActionDto, Icrc112Requests},
    error::CanisterError,
    repository::transaction::v2::{
        Icrc1Transfer, Icrc2Approve, Icrc2TransferFrom, Transaction, TransactionState,
    },
    service::{link::TemporaryAction, tx_manager::UpdateActionArgs},
};
use icrc_ledger_types::icrc1::account::Account;

use crate::utils::runtime::IcEnvironment;

// ---------- 2. Action creation ----------
/// Persists a TemporaryAction (and its transactions) into storage.
pub trait ActionCreator<E: IcEnvironment + Clone> {
    fn create_action(&mut self, temp: &mut TemporaryAction) -> Result<ActionDto, CanisterError>;
}

// ---------- 3. Transaction execution ----------
pub trait TransactionExecutor<E: IcEnvironment + Clone> {
    async fn execute_tx_by_id(&mut self, tx_id: String) -> Result<(), CanisterError>;
    async fn execute_canister_tx(&mut self, tx: &mut Transaction) -> Result<(), CanisterError>;
    async fn execute_icrc1_transfer(&self, tx: &Icrc1Transfer) -> Result<(), CanisterError>;
    async fn execute_icrc2_transfer_from(
        &self,
        tx: &Icrc2TransferFrom,
    ) -> Result<(), CanisterError>;
}

// ---------- 4. Transaction validation & manual status ----------
pub trait TransactionValidator<E: IcEnvironment + Clone> {
    async fn validate_balance_transfer(&self, tx: &Icrc1Transfer) -> Result<bool, CanisterError>;
    async fn validate_allowance(&self, tx: &Icrc2Approve) -> Result<bool, CanisterError>;
    async fn manual_check_status(
        &self,
        tx: &Transaction,
        all_txs: Vec<Transaction>,
    ) -> TransactionState;
    fn is_action_creator(&self, caller: &Principal, action_id: &str) -> Result<bool, String>;
}

// ---------- 5. Dependency analysis ----------
pub trait DependencyAnalyzer {
    fn has_dependency(&self, tx_id: &str) -> Result<bool, CanisterError>;
    fn is_group_has_dependency(&self, tx: &Transaction) -> Result<bool, CanisterError>;
}

// ---------- 6. Timeout handling ----------
pub trait TimeoutHandler<E: IcEnvironment + Clone> {
    fn spawn_tx_timeout_task(&self, tx_id: String) -> Result<(), String>;
    async fn tx_timeout_task(&mut self, tx_id: String) -> Result<(), CanisterError>;
    fn restart_processing_transactions(&self) -> ();
}

// ---------- 7. High-level action updater ----------
pub trait ActionUpdater<E: IcEnvironment + Clone> {
    async fn update_action(&mut self, caller: Principal, args: UpdateActionArgs) -> Result<ActionDto, CanisterError>;

    fn update_tx_state(
        &mut self,
        tx: &mut Transaction,
        state: &TransactionState,
    ) -> Result<(), CanisterError>;

    fn create_icrc_112(
        &self,
        caller: &Account,
        action_id: &str,
        link_id: &str,
        txs: &[Transaction],
    ) -> Result<Option<Icrc112Requests>, CanisterError>;
}

// ---------- 8. Batch helpers ----------
pub trait BatchExecutor<E: IcEnvironment + Clone> {
    async fn execute_canister_txs_batch(
        &mut self,
        txs: &mut [Transaction],
    ) -> Result<(), CanisterError>;

    async fn manual_check_status_batch(
        &self,
        txs: Vec<Transaction>,
        all_txs: Vec<Transaction>,
    ) -> Vec<(String, TransactionState)>;
}
