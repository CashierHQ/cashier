// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::link_result::{LinkCreateActionResult, LinkProcessActionResult},
    repository::{
        action::v1::{Action, ActionType},
        asset_info::v1::AssetInfo,
        intent::v1::Intent,
        link::v1::{Link, LinkState, LinkType},
        transaction::v1::Transaction,
    },
};
use std::{collections::HashMap, future::Future, pin::Pin, rc::Rc};
use transaction_manager::v2::traits::TransactionManager;
use uuid::Uuid;

use crate::apps::{
    link_v2::links::{
        shared::send_link::states::{
            active::ActiveState, created::CreatedState, inactive::InactiveState,
        },
        traits::{LinkV2, LinkV2State},
    },
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

pub struct TokenBasketLink {
    pub link: Link,
    pub canister_id: Principal,
}

impl TokenBasketLink {
    pub fn new(link: Link, canister_id: Principal) -> Self {
        Self { link, canister_id }
    }

    /// Create a new TokenBasketLink instance
    /// # Arguments
    /// * `creator` - The principal of the user creating the link
    /// * `title` - The title of the link
    /// * `asset_info` - The asset information associated with the link
    /// * `max_use` - The maximum number of times the link can be used
    /// * `created_at_ts` - The timestamp when the link is created
    /// # Returns
    /// * `TokenBasketLink` - The newly created TokenBasketLink instance
    pub fn create(
        creator: Principal,
        title: String,
        asset_info: Vec<AssetInfo>,
        max_use: u64,
        created_at_ts: u64,
        canister_id: Principal,
    ) -> Self {
        let new_link = Link {
            id: Uuid::new_v4().to_string(),
            link_type: LinkType::SendTokenBasket,
            title,
            asset_info,
            link_use_action_counter: 0,
            link_use_action_max_count: max_use,
            creator,
            state: LinkState::CreateLink,
            create_at: created_at_ts,
        };

        Self::new(new_link, canister_id)
    }
}

impl LinkV2 for TokenBasketLink {
    /// Creates an action for the TokenBasketLink.
    /// # Arguments
    /// * `canister_id` - The canister ID of the token contract.
    /// * `action_type` - The type of action to be created.
    /// # Returns
    /// * `Pin<Box<dyn Future<Output = Result<CreateActionResult, CanisterError>>>>` - A future that resolves to the resulting action or an error if the creation fails.
    async fn create_action<M, F, S, B>(
        &self,
        caller: Principal,
        action_type: ActionType,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        _token_balance_service: B,
    ) -> Result<LinkCreateActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match link.state {
            LinkState::CreateLink => {
                let state_handler = CreatedState::new(&link, canister_id);
                state_handler
                    .create_action(
                        caller,
                        action_type,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                        _token_balance_service,
                    )
                    .await
            }
            LinkState::Active => {
                let state_handler = ActiveState::new(&link, canister_id);
                state_handler
                    .create_action(
                        caller,
                        action_type,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                        _token_balance_service,
                    )
                    .await
            }
            LinkState::Inactive => {
                let state_handler = InactiveState::new(&link, canister_id);
                state_handler
                    .create_action(
                        caller,
                        action_type,
                        transaction_manager,
                        token_fee_service,
                        token_standard_service,
                        _token_balance_service,
                    )
                    .await
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for current link state".to_string(),
            )),
        }
    }

    async fn process_action<M>(
        &self,
        caller: Principal,
        action: Action,
        intents: Vec<Intent>,
        intent_txs_map: HashMap<String, Vec<Transaction>>,
        transaction_manager: M,
    ) -> Result<LinkProcessActionResult, CanisterError>
    where
        M: TransactionManager + 'static,
    {
        let link = self.link.clone();
        let canister_id = self.canister_id;

        match link.state {
            LinkState::CreateLink => {
                let state_handler = CreatedState::new(&link, canister_id);
                state_handler
                    .process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkState::Active => {
                let state_handler = ActiveState::new(&link, canister_id);
                state_handler
                    .process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            LinkState::Inactive => {
                let state_handler = InactiveState::new(&link, canister_id);
                state_handler
                    .process_action(caller, action, intents, intent_txs_map, transaction_manager)
                    .await
            }
            _ => Err(CanisterError::ValidationErrors(
                "Unsupported action type for current link state".to_string(),
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Nat;
    use cashier_backend_types::repository::common::Asset;
    use cashier_common::test_utils::random_principal_id;

    #[test]
    fn it_should_create_token_basket_link() {
        // Arrange
        let creator = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let title = "Test Token Basket Link".to_string();
        let asset1 = Asset::IC {
            address: ledger_id1,
        };
        let asset2 = Asset::IC {
            address: ledger_id2,
        };
        let asset_info = vec![
            AssetInfo {
                asset: asset1,
                label: "IC Token 1".to_string(),
                amount_per_link_use_action: Nat::from(1000u64),
            },
            AssetInfo {
                asset: asset2,
                label: "IC Token 2".to_string(),
                amount_per_link_use_action: Nat::from(2000u64),
            },
        ];
        let max_use = 5;
        let created_at_ts = 1_700_000_000;
        let canister_id = random_principal_id();

        // Act
        let link = TokenBasketLink::create(
            creator,
            title.clone(),
            asset_info.clone(),
            max_use,
            created_at_ts,
            canister_id,
        );

        // Assert
        assert_eq!(link.link.link_type, LinkType::SendTokenBasket);
        assert_eq!(link.link.title, title);
        assert_eq!(link.link.asset_info, asset_info);
        assert_eq!(link.link.link_use_action_max_count, max_use);
        assert_eq!(link.link.creator, creator);
        assert_eq!(link.link.state, LinkState::CreateLink);
        assert_eq!(link.link.create_at, created_at_ts);
    }
}
