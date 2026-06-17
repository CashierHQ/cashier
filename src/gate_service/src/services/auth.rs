// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub use gate_service_types::auth::Permission;

/// Storage for the auth service
pub type AuthServiceStorage = ic_mple_auth::AuthServiceStorage<Permission>;

/// Auth service
pub type AuthService<T> = ic_mple_auth::AuthService<T, Permission>;