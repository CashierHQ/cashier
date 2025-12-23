pub use cashier_backend_types::auth::Permission;

/// Storage for the auth service
pub type AuthServiceStorage = ic_mple_auth::AuthServiceStorage<Permission>;
