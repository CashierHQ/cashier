use candid::CandidType;
use cashier_essentials::storable;

const PK_PATTERN: &str = "intent";

#[derive(Debug, CandidType, Clone)]
#[storable]
pub struct Intent {
    pub pk: String,
    pub state: String,
    pub intent_type: String,
    pub link_id: String,
    pub creator_id: String,
    pub tx_map: Vec<Vec<String>>,
}

impl Intent {
    pub fn build_pk(id: String) -> String {
        format!("{}#{}", PK_PATTERN, id)
    }

    pub fn new(
        id: String,
        state: String,
        intent_type: String,
        link_id: String,
        creator_id: String,
        tx_map: Vec<Vec<String>>,
    ) -> Self {
        Self {
            pk: Self::build_pk(id),
            state,
            intent_type: intent_type,
            link_id,
            creator_id,
            tx_map,
        }
    }
}
