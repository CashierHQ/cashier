// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::{common::Chain, intent::v2::Intent, transaction::v2::Transaction};

use crate::{
    services::transaction_manager::{
        service::TransactionManagerService, traits::TransactionAssembler,
    },
    types::error::CanisterError,
    utils::runtime::IcEnvironment,
};

impl<E: IcEnvironment + Clone> TransactionAssembler<E> for TransactionManagerService<E> {
    fn assemble_txs(
        &self,
        chain: &Chain,
        intent: &Intent,
    ) -> Result<Vec<Transaction>, CanisterError> {
        // using intent adapter to get the txs by chain
        self.intent_adapter.intent_to_transactions(chain, intent)
    }
}
