pub use cashier_backend_types::auth::Permission;

/// Storage for the auth service
pub type AuthServiceStorage = ic_mple_auth::AuthServiceStorage<Permission>;

/// Auth service
pub type AuthService<T> = ic_mple_auth::AuthService<T, Permission>;
