use candid::CandidType;
use cashier_essentials::storable;

const PK_PATTERN: &str = "transaction";

#[derive(Clone, Debug, CandidType)]
#[storable]
pub struct Transaction {
    pub pk: String,
    pub canister_id: String,
    pub method: String,
    pub arg: String,
    pub state: String,
}

impl Transaction {
    pub fn build_pk(id: &str) -> String {
        format!("{}#{}", PK_PATTERN, id)
    }

    pub fn split_pk(pk: &str) -> String {
        pk.split('#').last().unwrap().to_string()
    }

    pub fn new(
        id: String,
        canister_id: String,
        method: String,
        arg: String,
        state: String,
    ) -> Self {
        Self {
            pk: Self::build_pk(id.as_str()),
            canister_id,
            method,
            arg,
            state,
        }
    }
}
