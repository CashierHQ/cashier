use cashier_macros::storable;

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
#[storable]
pub struct IntentTransaction {
    pub intent_id: String,
    pub transaction_id: String,
}
