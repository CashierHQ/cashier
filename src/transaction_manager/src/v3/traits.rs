// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    link_v3::action_result::{
        CreateActionResult as CreateActionResultV3, ProcessActionResult as ProcessActionResultV3,
    },
    repository::transaction::v1::Transaction,
};
use cashier_shared::types::Action as ActionShared;
use std::{collections::HashMap, future::Future, pin::Pin};

pub trait TransactionManagerV3 {
    fn create_action(
        &self,
        link_id: String,
        action: ActionShared,
    ) -> Result<CreateActionResultV3, CanisterError>;

    fn process_action(
        &self,
        link_id: String,
        action: ActionShared,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
    ) -> Pin<Box<dyn Future<Output = Result<ProcessActionResultV3, CanisterError>>>>;
}
