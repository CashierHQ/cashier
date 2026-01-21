// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

pub mod v1;
pub mod v2;

use cashier_macros::storable;
use ic_mple_structures::Codec;

/// Unified IntentCodec for storage versioning
/// Handles backward compatibility between v1 and v2 Intent
#[storable]
pub enum IntentCodec {
    V1(v1::Intent), // Old data without fee fields
    V2(v2::Intent), // New data with fee fields
}

impl Codec<v2::Intent> for IntentCodec {
    fn decode(source: Self) -> v2::Intent {
        match source {
            // Migrate V1 -> V2 with None values
            IntentCodec::V1(v1) => v2::Intent {
                id: v1.id,
                state: v1.state,
                created_at: v1.created_at,
                dependency: v1.dependency,
                chain: v1.chain,
                task: v1.task,
                r#type: v1.r#type,
                label: v1.label,
                intent_total_amount: None,
                intent_total_network_fee: None,
                intent_user_fee: None,
            },
            IntentCodec::V2(intent) => intent,
        }
    }

    fn encode(dest: v2::Intent) -> Self {
        IntentCodec::V2(dest)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::common::{Asset, Chain, Wallet};
    use candid::Nat;
    use v1::{IntentState, IntentTask, IntentType, TransferData};

    fn make_v1_intent() -> v1::Intent {
        v1::Intent {
            id: "test-id".to_string(),
            state: IntentState::Created,
            created_at: 1234567890,
            dependency: vec!["dep1".to_string()],
            chain: Chain::IC,
            task: IntentTask::TransferWalletToLink,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(100u64),
            }),
            label: "test-label".to_string(),
        }
    }

    fn make_v2_intent() -> v2::Intent {
        v2::Intent {
            id: "test-id-v2".to_string(),
            state: IntentState::Success,
            created_at: 9876543210,
            dependency: vec![],
            chain: Chain::IC,
            task: IntentTask::TransferLinkToWallet,
            r#type: IntentType::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: Asset::default(),
                amount: Nat::from(500u64),
            }),
            label: "test-label-v2".to_string(),
            intent_total_amount: Some(Nat::from(1000u64)),
            intent_total_network_fee: Some(Nat::from(10u64)),
            intent_user_fee: Some(Nat::from(50u64)),
        }
    }

    #[test]
    fn test_decode_v1_migrates_to_v2_with_none_fees() {
        // Arrange
        let v1_intent = make_v1_intent();
        let codec = IntentCodec::V1(v1_intent.clone());

        // Act
        let decoded: v2::Intent = IntentCodec::decode(codec);

        // Assert - all v1 fields preserved
        assert_eq!(decoded.id, v1_intent.id);
        assert_eq!(decoded.state, v1_intent.state);
        assert_eq!(decoded.created_at, v1_intent.created_at);
        assert_eq!(decoded.dependency, v1_intent.dependency);
        assert_eq!(decoded.chain, v1_intent.chain);
        assert_eq!(decoded.task, v1_intent.task);
        assert_eq!(decoded.label, v1_intent.label);
        // Assert - fee fields are None
        assert!(decoded.intent_total_amount.is_none());
        assert!(decoded.intent_total_network_fee.is_none());
        assert!(decoded.intent_user_fee.is_none());
    }

    #[test]
    fn test_decode_v2_returns_same_intent() {
        // Arrange
        let v2_intent = make_v2_intent();
        let codec = IntentCodec::V2(v2_intent.clone());

        // Act
        let decoded: v2::Intent = IntentCodec::decode(codec);

        // Assert - all fields preserved including fee fields
        assert_eq!(decoded.id, v2_intent.id);
        assert_eq!(decoded.state, v2_intent.state);
        assert_eq!(decoded.intent_total_amount, v2_intent.intent_total_amount);
        assert_eq!(
            decoded.intent_total_network_fee,
            v2_intent.intent_total_network_fee
        );
        assert_eq!(decoded.intent_user_fee, v2_intent.intent_user_fee);
    }

    #[test]
    fn test_encode_creates_v2_variant() {
        // Arrange
        let v2_intent = make_v2_intent();

        // Act
        let encoded = IntentCodec::encode(v2_intent.clone());

        // Assert
        match encoded {
            IntentCodec::V2(intent) => {
                assert_eq!(intent.id, v2_intent.id);
                assert_eq!(intent.intent_total_amount, v2_intent.intent_total_amount);
            }
            IntentCodec::V1(_) => panic!("Expected V2 variant"),
        }
    }
}
