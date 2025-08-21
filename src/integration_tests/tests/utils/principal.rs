use candid::Principal;
use cashier_common::test_utils::derive_principal;

/// This enum is used to represent the test users
pub enum TestUser {
    User1,
    User2,
    User3,
    TokenDeployer,
    // deployer of canister
    AdminDeployer,
    // admin but not the deployer of canister
    Admin2,
}

impl TestUser {
    /// This method returns the principal of the test user
    pub fn get_principal(&self) -> Principal {
        match self {
            TestUser::User1 => derive_principal("user1"),
            TestUser::User2 => derive_principal("user2"),
            TestUser::User3 => derive_principal("user3"),
            TestUser::TokenDeployer => derive_principal("token_deployer"),
            TestUser::AdminDeployer => derive_principal("admin1"),
            TestUser::Admin2 => derive_principal("admin2"),
        }
    }
}
