use base64::Engine;
use candid::{CandidType, Encode, Principal};

use crate::types::CanisterCall;

pub mod types;

// build a canister call payload with base64 encoded argument
// this canister call only execute on client side
pub fn build_canister_call<T: CandidType>(
    canister_id: &Principal,
    method: impl Into<String>,
    arg: &T,
) -> CanisterCall {
    CanisterCall {
        canister_id: canister_id.to_string(),
        method: method.into(),
        arg: base64::engine::general_purpose::STANDARD.encode(Encode!(arg).unwrap()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::build_canister_call;
    use candid::{Nat, Principal};
    use icrc_ledger_types::{
        icrc1::{account::Account, transfer::TransferArg},
        icrc2::approve::ApproveArgs,
    };

    #[test]
    fn test_build_icrc1_transfer() {
        // Arrange
        let canister_id = Principal::from_text("rh2pm-ryaaa-aaaan-qeniq-cai").unwrap();
        let transfer_arg = TransferArg {
            to: Account {
                owner: Principal::from_text(
                    "6pfju-rc52z-aihtt-ahhg6-z2bzc-ofp5r-igp5i-qy5ep-j6vob-gs3ae-nae",
                )
                .unwrap(),
                subaccount: None,
            },
            amount: Nat::from(10000000u64),
            memo: None,
            fee: None,
            created_at_time: None,
            from_subaccount: None,
        };

        // Act
        let result = build_canister_call(&canister_id, "icrc1_transfer", &transfer_arg);

        // Assert
        assert_eq!(result.canister_id, canister_id.to_text());
        assert_eq!(result.method, "icrc1_transfer".to_string());
        assert_eq!(
            result.arg,
            base64::engine::general_purpose::STANDARD.encode(Encode!(&transfer_arg).unwrap())
        );
    }

    #[test]
    fn test_build_icrc2_approve() {
        // Arrange
        let canister_id = Principal::from_text("rh2pm-ryaaa-aaaan-qeniq-cai").unwrap();
        let transfer_arg = ApproveArgs {
            from_subaccount: None,
            spender: Account {
                owner: "6pfju-rc52z-aihtt-ahhg6-z2bzc-ofp5r-igp5i-qy5ep-j6vob-gs3ae-nae"
                    .parse()
                    .unwrap(),
                subaccount: None,
            },
            amount: Nat::from(10000000u64),
            expected_allowance: None,
            expires_at: None,
            fee: None,
            memo: None,
            created_at_time: None,
        };

        // Act
        let result = build_canister_call(&canister_id, "icrc2_approve", &transfer_arg);

        // Assert
        assert_eq!(result.canister_id, canister_id.to_text());
        assert_eq!(result.method, "icrc2_approve".to_string());
        assert_eq!(
            result.arg,
            base64::engine::general_purpose::STANDARD.encode(Encode!(&transfer_arg).unwrap())
        );
    }

    #[test]
    fn test_build_mock_method() {
        use serde::{Deserialize, Serialize};

        #[derive(CandidType, Serialize, Deserialize, Debug, Clone, PartialEq)]
        struct MockPayload {
            id: u64,
            message: String,
        }

        // Arrange
        let canister_id = Principal::from_text("rh2pm-ryaaa-aaaan-qeniq-cai").unwrap();
        let payload = MockPayload {
            id: 42,
            message: "hello".to_string(),
        };

        // Act
        let result = build_canister_call(&canister_id, "mock_method", &payload);

        // Assert
        assert_eq!(result.canister_id, canister_id.to_text());
        assert_eq!(result.method, "mock_method".to_string());
        assert_eq!(
            result.arg,
            base64::engine::general_purpose::STANDARD.encode(Encode!(&payload).unwrap())
        );
    }
}
