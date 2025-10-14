use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::Chain,
        intent::v2::{Intent, IntentState, IntentTask, IntentType},
        transaction::v2::Transaction,
    },
};
use uuid::Uuid;

use crate::services::adapter::IntentAdapterImpl;

pub struct TransferWalletToTreasuryIntent {
    pub action_id: String,
    pub intent: Intent,
    pub transactions: Vec<Transaction>,
}

impl TransferWalletToTreasuryIntent {
    pub fn new(action_id: String, intent: Intent, transactions: Vec<Transaction>) -> Self {
        Self {
            action_id,
            intent,
            transactions,
        }
    }

    pub fn create(
        action_id: String,
        label: String,
        created_at_ts: u64,
    ) -> Result<Self, CanisterError> {
        let intent = Intent {
            id: Uuid::new_v4().to_string(),
            label,
            state: IntentState::Created,
            created_at: created_at_ts,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToTreasury,
            r#type: IntentType::default_transfer_from(),
        };

        let intent_adapter = IntentAdapterImpl::new();
        let transactions =
            intent_adapter.intent_to_transactions(&intent.chain, created_at_ts, &intent)?;

        Ok(Self {
            action_id,
            intent,
            transactions,
        })
    }
}
