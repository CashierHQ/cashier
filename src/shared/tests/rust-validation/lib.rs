// Rust validation test - verifies that generated Rust code compiles
//
// This module includes the generated Rust types and functions to ensure
// they compile correctly with the Rust compiler and candid dependencies.

#[allow(dead_code)]
mod types {
    include!("../../generated/rust/types.rs");
}

#[allow(dead_code)]
mod functions {
    use super::types::{IntentParticipants, TokenStandard};
    include!("../../generated/rust/functions.rs");
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;

    #[test]
    fn test_types_compile() {
        // Just verify types compile
        let _ = types::IntentParticipants::CreatorToTreasury;
        let _ = types::TokenStandard::ICRC1;
    }

    #[test]
    fn test_functions_compile() {
        // Verify functions compile with correct signatures
        let participants = types::IntentParticipants::CreatorToTreasury;
        let token_standard = types::TokenStandard::ICRC1;
        let amount = Nat::from(1000u64);

        let _ = functions::calculate_intent_total_amount(
            &participants,
            &amount,
            1,
            &amount,
            &amount,
        );

        let _ = functions::calculate_intent_total_network_fee(
            &participants,
            &token_standard,
            &amount,
            1,
        );

        let _ = functions::calculate_intent_user_fee(
            &participants,
            &amount,
            &amount,
        );
    }
}
