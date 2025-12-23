pub use cashier_backend_types::auth::Permission;

/// Auth service
pub type AuthService<T> = ic_mple_auth::AuthService<T, Permission>;
