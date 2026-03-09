// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        action::{
            v1::{ActionState, ActionType},
            v3::ActionV3,
        },
        common::AddressTypeV3,
        intent::v3::{CreateLinkToWalletIntentArgs, IntentV3},
        link::v3::LinkV3,
    },
};
use cashier_common::utils::get_link_account;
use transaction_manager::intents::v3::transfer_link_to_wallet::TransferLinkToWalletIntent;
use uuid::Uuid;

use crate::apps::link_v2::links::shared::utils::generate_intent_asset_label;

#[derive(Debug)]
pub struct ReceiveActionV3 {
    pub action: ActionV3,
    pub intents: Vec<IntentV3>,
}

impl ReceiveActionV3 {
    pub fn new(action: ActionV3, intents: Vec<IntentV3>) -> Self {
        Self { action, intents }
    }

    /// Creates a new ReceiveActionV3 for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `receiver_id` - The Principal ID of the receiver.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<ReceiveActionV3, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create(
        link: &LinkV3,
        receiver_id: Principal,
        canister_id: Principal,
        created_at: u64,
    ) -> Result<Self, CanisterError> {
        let mut action = ActionV3 {
            id: Uuid::new_v4().to_string(),
            action_type: ActionType::Receive,
            link_id: link.id.clone(),
            creator: receiver_id,
            creator_address_type: AddressTypeV3::User,
            state: ActionState::Created,
            intent_ids: vec![],
        };

        let link_account = get_link_account(&link.id, canister_id)?;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let sending_amount = asset_info.amount.clone();
                let input = CreateLinkToWalletIntentArgs {
                    label: generate_intent_asset_label(link.link_type, asset_info.asset.address),
                    receiver_id,
                    sending_amount,
                    asset: asset_info.asset.clone(),
                    source_address: canister_id,
                    link_account,
                    created_at_ts: created_at,
                };

                TransferLinkToWalletIntent::create(&action.id, input)
            })
            .collect::<Result<Vec<TransferLinkToWalletIntent>, CanisterError>>()?;

        let mut intents = Vec::<IntentV3>::new();
        link_to_wallet_intents
            .iter()
            .for_each(|link_to_wallet_intent| {
                intents.push(link_to_wallet_intent.intent.clone());
            });

        let intent_ids = intents.iter().map(|intent| intent.id.clone()).collect();
        action.intent_ids = intent_ids;

        Ok(Self::new(action, intents))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::{
        action::v1::ActionState,
        asset::v1::Asset,
        asset::v3::AssetV3,
        asset_info::v3::AssetInfoV3,
        common::Wallet,
        intent::v3::IntentTransactionDataV3,
        link::v1::LinkType,
        link::v3::LinkState,
    };
    use cashier_common::test_utils::random_principal_id;
    use uuid::Uuid;

    fn fixture_of_asset_info_v3(address: Principal, amount: Nat) -> AssetInfoV3 {
        AssetInfoV3 {
            asset: AssetV3 {
                address,
                network_fee: None,
                token_standard: cashier_backend_types::repository::asset::v3::TokenStandardV3::ICRC1,
            },
            label: "asset".to_string(),
            amount,
        }
    }

    fn fixture_of_link_v3(
        creator: Principal,
        asset_info: Vec<AssetInfoV3>,
        created_at: u64,
    ) -> LinkV3 {
        LinkV3 {
            id: Uuid::new_v4().to_string(),
            title: "Test Link V3".to_string(),
            link_type: LinkType::SendTokenBasket,
            asset_info,
            max_use: 3,
            use_count: 0,
            creator,
            state: LinkState::Active,
            created_at,
        }
    }

    #[tokio::test]
    async fn it_should_fail_create_receive_action_due_to_invalid_link_id() {
        // Arrange
        let receiver_id = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let mut link = fixture_of_link_v3(
            random_principal_id(),
            vec![fixture_of_asset_info_v3(
                random_principal_id(),
                Nat::from(1_000u64),
            )],
            created_at,
        );
        link.id = "invalid-link-id".to_string();

        // Act
        let result = ReceiveActionV3::create(&link, receiver_id, canister_id, created_at).await;

        // Assert
        assert!(matches!(result, Err(CanisterError::UnknownError(_))));
    }

    #[tokio::test]
    async fn it_should_succeed_create_receive_action() {
        // Arrange
        let receiver_id = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let ledger_id_1 = random_principal_id();
        let ledger_id_2 = random_principal_id();
        let amount_1 = Nat::from(1_000u64);
        let amount_2 = Nat::from(2_000u64);
        let link = fixture_of_link_v3(
            random_principal_id(),
            vec![
                fixture_of_asset_info_v3(ledger_id_1, amount_1.clone()),
                fixture_of_asset_info_v3(ledger_id_2, amount_2.clone()),
            ],
            created_at,
        );

        // Act
        let result = ReceiveActionV3::create(&link, receiver_id, canister_id, created_at).await;

        // Assert
        assert!(result.is_ok());
        let receive_action = result.expect("receive action should succeed");
        assert_eq!(receive_action.action.action_type, ActionType::Receive);
        assert_eq!(receive_action.action.creator, receiver_id);
        assert_eq!(
            receive_action.action.creator_address_type,
            AddressTypeV3::User
        );
        assert_eq!(receive_action.action.state, ActionState::Created);
        assert_eq!(receive_action.intents.len(), 2);
        assert_eq!(
            receive_action.action.intent_ids.len(),
            receive_action.intents.len()
        );

        let link_account = get_link_account(&link.id, canister_id).expect("link account valid");
        let intent_1 = receive_action
            .intents
            .iter()
            .find(|intent| intent.label == generate_intent_asset_label(link.link_type, ledger_id_1))
            .expect("intent for ledger 1 should exist");
        let intent_2 = receive_action
            .intents
            .iter()
            .find(|intent| intent.label == generate_intent_asset_label(link.link_type, ledger_id_2))
            .expect("intent for ledger 2 should exist");

        match intent_1
            .intent_tx_data
            .clone()
            .expect("intent 1 tx data should exist")
        {
            IntentTransactionDataV3::Transfer(transfer_data) => {
                assert_eq!(transfer_data.from, link_account.into());
                assert_eq!(transfer_data.to, Wallet::new(receiver_id));
                assert_eq!(
                    transfer_data.asset,
                    Asset::IC {
                        address: ledger_id_1
                    }
                );
                assert_eq!(transfer_data.amount, amount_1);
            }
            _ => panic!("expected Transfer intent transaction data for intent 1"),
        }

        match intent_2
            .intent_tx_data
            .clone()
            .expect("intent 2 tx data should exist")
        {
            IntentTransactionDataV3::Transfer(transfer_data) => {
                assert_eq!(transfer_data.from, link_account.into());
                assert_eq!(transfer_data.to, Wallet::new(receiver_id));
                assert_eq!(
                    transfer_data.asset,
                    Asset::IC {
                        address: ledger_id_2
                    }
                );
                assert_eq!(transfer_data.amount, amount_2);
            }
            _ => panic!("expected Transfer intent transaction data for intent 2"),
        }
    }
}
