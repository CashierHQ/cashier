use candid::CandidType;
use ic_mple_log::service::Storage;
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
    pub type AuthService<T: Storage<AuthServiceStorage>> = ic_mple_auth::AuthService<T, Permission>;
