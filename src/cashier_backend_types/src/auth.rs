use candid::CandidType;
use serde::Deserialize;

    /// Principal specific permission
    #[derive(
        Debug,
        Clone,
        CandidType,
        Deserialize,
        Hash,
        PartialEq,
        Eq,
        PartialOrd,
        Ord,
        serde::Serialize,
    )]
    pub enum Permission {
        /// Admin of the canister
        Admin,        
    }
    