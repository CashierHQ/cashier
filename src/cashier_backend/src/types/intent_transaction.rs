use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct IntentTransaction {
    pub intent_id: String,
    pub transaction_id: String,
    pub created_at: u64,
}

impl IntentTransaction {
    pub fn new(intent_id: String, transaction_id: String, ts: u64) -> Self {
        Self {
            intent_id,
            transaction_id,
            created_at: ts,
        }
    }

    pub fn to_persistence(
        &self,
    ) -> crate::repositories::entities::intent_transaction::IntentTransaction {
        crate::repositories::entities::intent_transaction::IntentTransaction::new(
            self.intent_id.clone(),
            self.transaction_id.clone(),
            self.created_at,
        )
    }

    pub fn from_persistence(
        intent_transaction: crate::repositories::entities::intent_transaction::IntentTransaction,
    ) -> Self {
        let (intent_id, transaction_id) =
            crate::repositories::entities::intent_transaction::IntentTransaction::split_pk(
                &intent_transaction,
            );

        Self {
            intent_id: intent_id,
            transaction_id,
            created_at: intent_transaction.created_at,
        }
    }
}
