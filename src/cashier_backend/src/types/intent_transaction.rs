use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct IntentTransaction {
    pub acton_id: String,
    pub transaction_id: String,
    pub created_at: u64,
}

impl IntentTransaction {
    pub fn new(acton_id: String, transaction_id: String, ts: u64) -> Self {
        Self {
            acton_id,
            transaction_id,
            created_at: ts,
        }
    }

    pub fn to_persistence(
        &self,
    ) -> crate::repositories::entities::intent_transaction::IntentTransaction {
        crate::repositories::entities::intent_transaction::IntentTransaction::new(
            self.acton_id.clone(),
            self.transaction_id.clone(),
            self.created_at,
        )
    }

    pub fn from_persistence(
        intent_transaction: crate::repositories::entities::intent_transaction::IntentTransaction,
    ) -> Self {
        let (acton_id, transaction_id) =
            crate::repositories::entities::intent_transaction::IntentTransaction::split_pk(
                &intent_transaction,
            );

        Self {
            acton_id,
            transaction_id,
            created_at: intent_transaction.created_at,
        }
    }
}
