// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::token::RuneInfo;

/// Validate rune-specific fields.
///
/// # Arguments
/// * `is_rune` - Whether the token is marked as a Rune token.
/// * `rune_info` - Optional Rune-specific metadata associated with the token.
///
/// # Returns
/// * `Ok(())` if the Rune-related input is valid.
/// * `Err(String)` if `is_rune` is `Some(true)` but `rune_info` is missing or has empty fields.
pub fn validate_rune_input(
    is_rune: Option<bool>,
    rune_info: &Option<RuneInfo>,
) -> Result<(), String> {
    if is_rune == Some(true) {
        match rune_info {
            None => return Err("rune_info is required when is_rune is true".to_string()),
            Some(info) if info.rune_id.is_empty() => {
                return Err(
                    "rune_info.rune_id and rune_info.token_id must not be empty".to_string()
                );
            }
            Some(info) if info.token_id.is_empty() => {
                return Err(
                    "rune_info.rune_id and rune_info.token_id must not be empty".to_string()
                );
            }
            _ => {}
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_rune_info(rune_id: &str, token_id: &str) -> RuneInfo {
        RuneInfo {
            rune_id: rune_id.to_string(),
            token_id: token_id.to_string(),
        }
    }

    #[test]
    fn it_should_fail_validate_rune_token_without_rune_info() {
        // Arrange

        // Act
        let result = validate_rune_input(Some(true), &None);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("rune_info is required when is_rune is true")
        );
    }

    #[test]
    fn it_should_fail_validate_rune_token_with_empty_rune_id() {
        // Arrange
        let rune_info = Some(fixture_rune_info("", "omnity-token-id"));

        // Act
        let result = validate_rune_input(Some(true), &rune_info);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("rune_info.rune_id and rune_info.token_id must not be empty")
        );
    }

    #[test]
    fn it_should_fail_validate_rune_token_with_empty_token_id() {
        // Arrange
        let rune_info = Some(fixture_rune_info("UNCOMMON•GOODS", ""));

        // Act
        let result = validate_rune_input(Some(true), &rune_info);

        // Assert
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .contains("rune_info.rune_id and rune_info.token_id must not be empty")
        );
    }

    #[test]
    fn it_should_pass_validate_non_rune_token_without_rune_info() {
        // Arrange

        // Act
        let result = validate_rune_input(None, &None);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_pass_validate_non_rune_token_with_is_rune_false() {
        // Arrange

        // Act
        let result = validate_rune_input(Some(false), &None);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_pass_validate_rune_token_with_valid_rune_info() {
        // Arrange
        let rune_info = Some(fixture_rune_info("UNCOMMON•GOODS", "omnity-rune-token-id"));

        // Act
        let result = validate_rune_input(Some(true), &rune_info);

        // Assert
        assert!(result.is_ok());
    }
}
