// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use token_storage_types::token::RuneInfo;

/// Validate rune_id format: must be BLOCK:TX where block is u64 and tx is u32.
///
/// Rules from the Runes protocol spec:
/// - Exactly one `:` separator
/// - `block` is a valid u64
/// - `tx` is a valid u32
/// - `0:0` is reserved (genesis cenotaph placeholder)
/// - `block=0 && tx!=0` is a cenotaph (invalid runestone)
/// - `block < 840_000` is invalid (before mainnet genesis)
fn validate_rune_id(rune_id: &str) -> Result<(), String> {
    let parts: Vec<&str> = rune_id.split(':').collect();
    if parts.len() != 2 {
        return Err(format!(
            "rune_id '{}' must be in BLOCK:TX format with exactly one ':' separator",
            rune_id
        ));
    }

    let block: u64 = parts[0].parse().map_err(|_| {
        format!(
            "rune_id block component '{}' must be a valid u64",
            parts[0]
        )
    })?;

    let tx: u32 = parts[1].parse().map_err(|_| {
        format!(
            "rune_id tx component '{}' must be a valid u32",
            parts[1]
        )
    })?;

    if block == 0 && tx == 0 {
        return Err("rune_id '0:0' is reserved and cannot be used as a token record".to_string());
    }

    // block=0 with tx!=0 is a cenotaph (invalid runestone)
    if block == 0 {
        return Err(format!(
            "rune_id '{}' is invalid: block=0 with tx!=0 indicates a cenotaph",
            rune_id
        ));
    }

    if block < 840_000 {
        return Err(format!(
            "rune_id '{}' is invalid: block must be >= 840000 (Runes mainnet genesis)",
            rune_id
        ));
    }

    Ok(())
}

/// Validate rune-specific fields.
///
/// # Arguments
/// * `is_rune` - Whether the token is marked as a Rune token.
/// * `rune_info` - Optional Rune-specific metadata associated with the token.
///
/// # Returns
/// * `Ok(())` if the Rune-related input is valid.
/// * `Err(String)` if `is_rune` is `Some(true)` but `rune_info` is missing or invalid.
pub fn validate_rune_input(
    is_rune: Option<bool>,
    rune_info: &Option<RuneInfo>,
) -> Result<(), String> {
    if is_rune == Some(true) {
        match rune_info {
            None => return Err("rune_info is required when is_rune is true".to_string()),
            Some(info) if info.rune_id.is_empty() => {
                return Err("rune_info.rune_id must not be empty".to_string());
            }
            Some(info) if info.token_id.is_empty() => {
                return Err("rune_info.token_id must not be empty".to_string());
            }
            Some(info) => {
                validate_rune_id(&info.rune_id)?;
            }
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
            icon: None,
        }
    }

    // --- validate_rune_id failure cases ---

    #[test]
    fn it_should_fail_validate_rune_id_with_no_separator() {
        // Arrange / Act
        let result = validate_rune_id("840000");

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("BLOCK:TX format"));
    }

    #[test]
    fn it_should_fail_validate_rune_id_with_multiple_separators() {
        // Arrange / Act
        let result = validate_rune_id("840000:1:2");

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("BLOCK:TX format"));
    }

    #[test]
    fn it_should_fail_validate_rune_id_with_non_numeric_block() {
        // Arrange / Act
        let result = validate_rune_id("abc:1");

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("valid u64"));
    }

    #[test]
    fn it_should_fail_validate_rune_id_with_non_numeric_tx() {
        // Arrange / Act
        let result = validate_rune_id("840000:abc");

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("valid u32"));
    }

    #[test]
    fn it_should_fail_validate_rune_id_due_to_reserved_0_0() {
        // Arrange / Act
        let result = validate_rune_id("0:0");

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("reserved"));
    }

    #[test]
    fn it_should_fail_validate_rune_id_due_to_cenotaph() {
        // Arrange / Act
        let result = validate_rune_id("0:1");

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cenotaph"));
    }

    #[test]
    fn it_should_fail_validate_rune_id_due_to_pre_genesis_block() {
        // Arrange / Act
        let result = validate_rune_id("839999:1");

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("840000"));
    }

    // --- validate_rune_input failure cases ---

    #[test]
    fn it_should_fail_validate_rune_token_without_rune_info() {
        // Arrange / Act
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
        assert!(result.unwrap_err().contains("rune_info.rune_id must not be empty"));
    }

    #[test]
    fn it_should_fail_validate_rune_token_with_empty_token_id() {
        // Arrange
        let rune_info = Some(fixture_rune_info("840000:1", ""));

        // Act
        let result = validate_rune_input(Some(true), &rune_info);

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("rune_info.token_id must not be empty"));
    }

    #[test]
    fn it_should_fail_validate_rune_token_with_invalid_rune_id_format() {
        // Arrange
        let rune_info = Some(fixture_rune_info("UNCOMMON•GOODS", "omnity-rune-token-id"));

        // Act
        let result = validate_rune_input(Some(true), &rune_info);

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("BLOCK:TX format"));
    }

    #[test]
    fn it_should_fail_validate_rune_token_with_pre_genesis_rune_id() {
        // Arrange
        let rune_info = Some(fixture_rune_info("100000:5", "omnity-rune-token-id"));

        // Act
        let result = validate_rune_input(Some(true), &rune_info);

        // Assert
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("840000"));
    }

    // --- success cases ---

    #[test]
    fn it_should_pass_validate_rune_id_at_genesis_block() {
        // Arrange / Act
        let result = validate_rune_id("840000:1");

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_pass_validate_rune_id_above_genesis_block() {
        // Arrange / Act
        let result = validate_rune_id("890000:42");

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_pass_validate_non_rune_token_without_rune_info() {
        // Arrange / Act
        let result = validate_rune_input(None, &None);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_pass_validate_non_rune_token_with_is_rune_false() {
        // Arrange / Act
        let result = validate_rune_input(Some(false), &None);

        // Assert
        assert!(result.is_ok());
    }

    #[test]
    fn it_should_pass_validate_rune_token_with_valid_rune_info() {
        // Arrange
        let rune_info = Some(fixture_rune_info("840000:1", "omnity-rune-token-id"));

        // Act
        let result = validate_rune_input(Some(true), &rune_info);

        // Assert
        assert!(result.is_ok());
    }
}
