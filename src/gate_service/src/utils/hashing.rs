use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
};

#[cfg(not(feature = "canbench-rs"))]
use argon2::password_hash::rand_core::OsRng;

/// Hashes a password using Argon2.
/// # Arguments
/// * `password`: The password to be hashed.
/// # Returns
/// * `Ok(String)`: If the password is hashed successfully.
/// * `Err(String)`: If there is an error during hashing.
pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = get_salt()?;

    // Argon2 with default params (Argon2id v19)
    let argon2 = Argon2::default();

    // Hash password to PHC string ($argon2id$v=19$...)
    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();
    Ok(password_hash)
}

fn get_salt() -> Result<SaltString, String> {
    #[cfg(feature = "canbench-rs")]
    {
        SaltString::from_b64("YWJjZGVmZ2hpamtsbW5vcA").map_err(|e| e.to_string())
    }

    #[cfg(not(feature = "canbench-rs"))]
    {
        Ok(SaltString::generate(&mut OsRng))
    }
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
}
