// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use rand::RngCore;
use sha2::{Digest, Sha256};

/// Hashes a password using Argon2.
/// # Arguments
/// * `password`: The password to be hashed.
/// # Returns
/// * `Ok(String)`: If the password is hashed successfully.
/// * `Err(String)`: If there is an error during hashing.
pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);

    // Argon2 with default params (Argon2id v19)
    let argon2 = Argon2::default();

    // Hash password to PHC string ($argon2id$v=19$...)
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();
    Ok(password_hash)
}

/// Verifies a password against a hashed password using Argon2.
/// # Arguments
/// * `password`: The password to be verified.
/// * `hashed`: The hashed password to verify against.
/// # Returns
/// * `Ok(())`: If the password is verified successfully.
/// * `Err(String)`: If there is an error during verification.
pub fn verify_password(password: &str, hashed: &str) -> Result<(), String> {
    let parsed_hash = PasswordHash::new(hashed).map_err(|e| e.to_string())?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|e| e.to_string())?;
    Ok(())
}

const SHA256_PREFIX: &str = "sha256$";

/// Hashes a password using SHA256 with a random 32-byte salt.
/// Returns a prefixed string: `sha256$<hex_salt>$<hex_hash>` for storage.
/// # Arguments
/// * `password`: The plaintext password to hash.
/// # Returns
/// * `Ok(String)`: Encoded hash in `sha256$<hex_salt>$<hex_hash>` format.
/// * `Err(String)`: Hash construction failed (should not occur in practice).
pub fn hash_password_sha256(password: &str) -> Result<String, String> {
    let mut salt = [0u8; 32];
    OsRng.fill_bytes(&mut salt);

    let mut hasher = Sha256::new();
    hasher.update(salt);
    hasher.update(password.as_bytes());
    let hash = hasher.finalize();

    Ok(format!(
        "{}{}${}",
        SHA256_PREFIX,
        hex::encode(salt),
        hex::encode(hash),
    ))
}

/// Verifies a plaintext password against a stored SHA256 hash string produced by
/// `hash_password_sha256`.
/// # Arguments
/// * `password`: The plaintext password to check.
/// * `stored`: The stored hash string in `sha256$<hex_salt>$<hex_hash>` format.
/// # Returns
/// * `Ok(())`: The password matches the stored hash.
/// * `Err(String)`: The password is incorrect, or `stored` has an unexpected format.
pub fn verify_password_sha256(password: &str, stored: &str) -> Result<(), String> {
    let inner = stored
        .strip_prefix(SHA256_PREFIX)
        .ok_or_else(|| "invalid sha256 hash format".to_string())?;

    let parts: Vec<&str> = inner.splitn(2, '$').collect();
    if parts.len() != 2 {
        return Err("invalid sha256 hash format".to_string());
    }

    let salt_bytes = hex::decode(parts[0]).map_err(|e| e.to_string())?;
    let expected_hash = hex::decode(parts[1]).map_err(|e| e.to_string())?;

    let mut hasher = Sha256::new();
    hasher.update(&salt_bytes);
    hasher.update(password.as_bytes());
    let actual_hash = hasher.finalize();

    if actual_hash[..] == expected_hash[..] {
        Ok(())
    } else {
        Err("invalid password".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_should_success_hash_password() {
        // Arrange
        let password = "password123";

        // Act
        let hashed = hash_password(password).unwrap();

        // Assert
        assert!(!hashed.is_empty());
        assert_ne!(password, hashed);
    }

    #[test]
    fn it_should_error_verify_password() {
        // Arrange
        let password = "password123";
        let wrong_password = "wrongpassword";
        let hashed = hash_password(password).unwrap();

        // Act
        let result = verify_password(wrong_password, &hashed);

        // Assert
        assert!(result.is_err());
    }

    #[test]
    fn it_should_success_verify_password() {
        // Arrange
        let password = "password123";
        let hashed = hash_password(password).unwrap();

        // Act
        let result = verify_password(password, &hashed);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_success_hash_password_sha256() {
        // Arrange
        let password = "password123";

        // Act
        let hashed = hash_password_sha256(password).unwrap();

        // Assert
        assert!(hashed.starts_with("sha256$"));
        assert_ne!(password, hashed);
    }

    #[test]
    fn it_should_error_verify_password_sha256_due_to_wrong_password() {
        // Arrange
        let password = "password123";
        let wrong_password = "wrongpassword";
        let hashed = hash_password_sha256(password).unwrap();

        // Act
        let result = verify_password_sha256(wrong_password, &hashed);

        // Assert
        assert!(result.is_err());
    }

    #[test]
    fn it_should_success_verify_password_sha256() {
        // Arrange
        let password = "password123";
        let hashed = hash_password_sha256(password).unwrap();

        // Act
        let result = verify_password_sha256(password, &hashed);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_error_verify_password_sha256_due_to_invalid_format() {
        // Arrange
        let password = "password123";

        // Act
        let result = verify_password_sha256(password, "not_a_sha256_hash");

        // Assert
        assert!(result.is_err());
    }
}
