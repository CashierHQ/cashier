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

    /// Storage for the auth service
    pub type AuthServiceStorage = ic_mple_auth::AuthServiceStorage<Permission>;

    /// Auth service
    pub type AuthService<T> = ic_mple_auth::AuthService<T, Permission>;
