use cashier_macros::storable;

#[derive(Debug, Clone, Hash, PartialEq, Eq)]
#[storable]
pub struct ActionIntent {
    pub action_id: String,
    pub intent_id: String,
}
