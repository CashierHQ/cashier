// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        intent::v1::{CreateLinkToWalletIntentArgs, Intent},
        link::v1::Link,
    },
};
use cashier_common::utils::get_link_account;
use transaction_manager::intents::v2::transfer_link_to_wallet::TransferLinkToWalletIntent;
use uuid::Uuid;

use crate::apps::link_v2::links::shared::utils::generate_intent_asset_label;

#[derive(Debug)]
pub struct ReceiveAction {
    pub action: Action,
    pub intents: Vec<Intent>,
}

impl ReceiveAction {
    pub fn new(action: Action, intents: Vec<Intent>) -> Self {
        Self { action, intents }
    }

    /// Creates a new ReceiveAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `receiver_id` - The Principal ID of the receiver.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<ReceiveAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create(
        link: &Link,
        receiver_id: Principal,
        canister_id: Principal,
    ) -> Result<Self, CanisterError> {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::Receive,
            link_id: link.id.clone(),
            creator: receiver_id,
            state: ActionState::Created,
        };

        let link_account = get_link_account(&link.id, canister_id)?;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let sending_amount = asset_info.amount_per_link_use_action.clone();
                let input = CreateLinkToWalletIntentArgs {
                    label: generate_intent_asset_label(
                        link.link_type,
                        asset_info.asset.get_address(),
                    ),
                    receiver_id,
                    sending_amount,
                    asset: asset_info.asset.clone(),
                    link_account,
                    created_at_ts: link.create_at,
                };

                TransferLinkToWalletIntent::create(input)
            })
            .collect::<Result<Vec<TransferLinkToWalletIntent>, CanisterError>>()?;

        let mut intents = Vec::<Intent>::new();
        link_to_wallet_intents
            .iter()
            .for_each(|link_to_wallet_intent| {
                intents.push(link_to_wallet_intent.intent.clone());
            });

        Ok(Self::new(action, intents))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::{
        asset::v1::Asset,
        asset_info::v1::AssetInfo,
        common::Wallet,
        intent::v1::IntentType,
        link::v1::{LinkState, LinkType},
    };
    use cashier_common::test_utils::random_principal_id;
    use uuid::Uuid;

    #[tokio::test]
    async fn it_should_create_receive_action() {
        // Arrange
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let amount_1 = Nat::from(1_000u64);
        let amount_2 = Nat::from(2_000u64);
        let asset_info1 = AssetInfo {
            asset: Asset::IC {
                address: ledger_id1,
            },
            label: "Test Asset1".to_string(),
            amount_per_link_use_action: amount_1.clone(),
        };
        let asset_info2 = AssetInfo {
            asset: Asset::IC {
                address: ledger_id2,
            },
            label: "Test Asset2".to_string(),
            amount_per_link_use_action: amount_2.clone(),
        };

        let link = Link {
            id: Uuid::new_v4().to_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTokenBasket,
            creator: random_principal_id(),
            asset_info: vec![asset_info1.clone(), asset_info2.clone()],
            link_use_action_max_count: 3,
            link_use_action_counter: 0,
            state: LinkState::Active,
            create_at: 0,
        };
        let receiver_id = random_principal_id();
        let canister_id = random_principal_id();

        // Act
        let result = ReceiveAction::create(&link, receiver_id, canister_id).await;

        // Assert
        assert!(result.is_ok());
        let receive_action = result.unwrap();
        let action = receive_action.action;
        let intents = receive_action.intents;

        // Assert action
        assert_eq!(action.r#type, ActionType::Receive);
        assert_eq!(action.creator, receiver_id);
        assert_eq!(action.state, ActionState::Created);

        // Assert intents
        assert_eq!(intents.len(), 2);

        let link_account = get_link_account(&link.id, canister_id).unwrap();

        // Assert ledger1 intent
        let intent1 = intents
            .iter()
            .find(|intent| intent.label == generate_intent_asset_label(link.link_type, ledger_id1))
            .unwrap();
        match &intent1.r#type {
            IntentType::Transfer(transfer_data) => {
                assert_eq!(transfer_data.from, link_account.into());
                assert_eq!(transfer_data.to, Wallet::new(receiver_id));
                assert_eq!(transfer_data.asset, asset_info1.asset);
                assert_eq!(transfer_data.amount, amount_1);
            }
            _ => panic!("Expected Transfer intent"),
        }

        // Assert ledger2 intent
        let intent2 = intents
            .iter()
            .find(|intent| intent.label == generate_intent_asset_label(link.link_type, ledger_id2))
            .unwrap();
        match &intent2.r#type {
            IntentType::Transfer(transfer_data) => {
                assert_eq!(transfer_data.from, link_account.into());
                assert_eq!(transfer_data.to, Wallet::new(receiver_id));
                assert_eq!(transfer_data.asset, asset_info2.asset);
                assert_eq!(transfer_data.amount, amount_2);
            }
            _ => panic!("Expected Transfer intent"),
        }
    }
}
