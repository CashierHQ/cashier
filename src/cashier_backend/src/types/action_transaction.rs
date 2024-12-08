use candid::CandidType;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, CandidType, Clone)]
pub struct ActionTransaction {
    pub acton_id: String,
    pub transaction_id: String,
    pub created_at: u64,
}

impl ActionTransaction {
    pub fn new(acton_id: String, transaction_id: String, ts: u64) -> Self {
        Self {
            acton_id,
            transaction_id,
            created_at: ts,
        }
    }

    pub fn to_persistence(
        &self,
    ) -> crate::repositories::entities::action_transaction::ActionTransaction {
        crate::repositories::entities::action_transaction::ActionTransaction::new(
            self.acton_id.clone(),
            self.transaction_id.clone(),
            self.created_at,
        )
    }

    pub fn from_persistence(
        action_transaction: crate::repositories::entities::action_transaction::ActionTransaction,
    ) -> Self {
        let (acton_id, transaction_id) =
            crate::repositories::entities::action_transaction::ActionTransaction::split_pk(
                &action_transaction,
            );

        Self {
            acton_id,
            transaction_id,
            created_at: action_transaction.created_at,
        }
    }
}
