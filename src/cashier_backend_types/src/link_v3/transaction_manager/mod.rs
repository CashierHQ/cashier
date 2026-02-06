use crate::repository::transaction::v1::Transaction;
use cashier_shared::types::Action as ActionShared;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct RollupActionStateResultV3 {
    pub action: ActionShared,
    pub intent_txs_map: HashMap<String, Vec<Transaction>>,
}
