// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
use cashier_backend_types::repository::common::Asset;
use cashier_backend_types::repository::intent::v1::CreateLinkToWalletIntentArgs;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        intent::v1::Intent,
        link::v1::Link,
    },
};
use cashier_common::utils::get_link_account;
use transaction_manager::intents::transfer_link_to_wallet::TransferLinkToWalletIntent;

use crate::apps::{
    link_v2::links::shared::utils::{generate_intent_asset_label, link_asset_principals},
    token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
};
use uuid::Uuid;

#[derive(Debug)]
pub struct WithdrawAction {
    pub action: Action,
    pub intents: Vec<Intent>,
}

impl WithdrawAction {
    pub fn new(action: Action, intents: Vec<Intent>) -> Self {
        Self { action, intents }
    }

    /// Creates a new WithdrawAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<WithdrawAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create<F, B>(
        link: &Link,
        canister_id: Principal,
        mut token_fee_service: F,
        token_balance_service: B,
    ) -> Result<Self, CanisterError>
    where
        F: TokenFeeCache,
        B: TokenBalanceFetcher,
    {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::Withdraw,
            link_id: link.id.clone(),
            creator: link.creator,
            state: ActionState::Created,
        };

        let link_account = get_link_account(&link.id, canister_id)?;
        let asset_principals = link_asset_principals(link);
        let token_fee_map = token_fee_service
            .get_batch_tokens_fee(&asset_principals)
            .await?;
        let actual_token_balance_map = token_balance_service
            .get_batch_token_balances(&link_account.into(), &asset_principals)
            .await?;

        // intents
        let link_to_wallet_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let address = match asset_info.asset {
                    Asset::IC { address } => address,
                };
                let sending_amount = actual_token_balance_map
                    .get(&address)
                    .cloned()
                    .unwrap_or(Nat::from(0u64));
                let fee_amount = token_fee_map
                    .get(&address)
                    .cloned()
                    .unwrap_or(Nat::from(0u64));
                let sending_amount = if sending_amount <= fee_amount {
                    Nat::from(0u64)
                } else {
                    sending_amount - fee_amount
                };

                let input = CreateLinkToWalletIntentArgs {
                    label: generate_intent_asset_label(link.link_type, &asset_info.asset),
                    receiver_id: link.creator,
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
    use crate::apps::{
        token_balance::service::tests::MockTokenBalanceService,
        token_fee::service::tests::{
            MockTokenFeeService, create_mock_service as create_mock_token_fee_service,
        },
    };
    use cashier_backend_types::repository::{
        asset_info::AssetInfo,
        common::Wallet,
        intent::v1::IntentType,
        link::v1::{LinkState, LinkType},
    };
    use cashier_common::{constant::ICP_CANISTER_PRINCIPAL, test_utils::random_principal_id};

    /// Helper function to create a test fixture for WithdrawAction tests
    /// # Arguments:
    /// * `creator` - The principal of the user creating the link
    /// * `canister_id` - The canister ID of the backend canister
    /// * `ledger_ids` - A vector of ledger IDs for the assets
    /// * `amounts` - A vector of amounts corresponding to each ledger ID
    /// * `max_use` - The maximum number of times the link can be used
    /// * `current_ts` - The current timestamp for setting up the token fee service
    /// # Returns:
    /// * `(Link, Principal, MockTokenFeeService, MockTokenBalanceService)` - A tuple containing the created Link, canister ID, mock token fee service, and mock token balance service for testing
    fn test_fixture(
        creator: Principal,
        canister_id: Principal,
        ledger_ids: Vec<Principal>,
        amounts: Vec<Nat>,
        max_use: u64,
        current_ts: u64,
    ) -> (
        Link,
        Principal,
        MockTokenFeeService,
        MockTokenBalanceService,
    ) {
        let asset_info = ledger_ids
            .into_iter()
            .zip(amounts)
            .map(|(id, amount)| AssetInfo {
                asset: Asset::IC { address: id },
                amount_per_link_use_action: amount,
                label: "asset".to_string(),
            })
            .collect::<Vec<AssetInfo>>();

        let link = Link {
            id: Uuid::new_v4().to_string(),
            title: "Test Link".to_string(),
            link_type: LinkType::SendTip,
            creator,
            asset_info,
            link_use_action_max_count: max_use,
            link_use_action_counter: 0,
            state: LinkState::CreateLink,
            create_at: 1_000_000,
        };
        let token_fee_service = create_mock_token_fee_service(current_ts);
        let mut token_balance_service = MockTokenBalanceService::new();

        token_balance_service.set_balance(ICP_CANISTER_PRINCIPAL, Nat::from(0u64));
        token_fee_service
            .fetcher
            .set_fee(ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64));

        (link, canister_id, token_fee_service, token_balance_service)
    }

    #[tokio::test]
    async fn it_should_fail_create_withdraw_action_if_token_fee_service_fails() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let amount = Nat::from(1_000u64);
        let (link, canister_id, token_fee_service, token_balance_service) = test_fixture(
            creator,
            canister_id,
            vec![ledger_id],
            vec![amount],
            3,
            1_000_000,
        );
        token_fee_service
            .fetcher
            .set_error(ledger_id, "not found fee for token");

        // Act
        let result =
            WithdrawAction::create(&link, canister_id, token_fee_service, token_balance_service)
                .await;

        // Assert
        assert!(result.is_err());
        let err = result.err().unwrap();
        if let CanisterError::CallCanisterFailed(err_msg) = err {
            assert!(err_msg.contains("Failed to get fee"));
        } else {
            panic!("Unexpected error type: {:?}", err);
        }
    }

    #[tokio::test]
    async fn it_should_fail_create_withdraw_action_if_token_balance_service_fails() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let amount = Nat::from(1_000u64);
        let (link, canister_id, token_fee_service, token_balance_service) = test_fixture(
            creator,
            canister_id,
            vec![ledger_id],
            vec![amount],
            3,
            1_000_000,
        );
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(10u64));

        // Act
        let result =
            WithdrawAction::create(&link, canister_id, token_fee_service, token_balance_service)
                .await;

        // Assert
        assert!(result.is_err());
        let err = result.err().unwrap();
        if let CanisterError::HandleLogicError(err_msg) = err {
            assert!(err_msg.contains("Not found balance"));
        } else {
            panic!("Unexpected error type: {:?}", err);
        }
    }

    #[tokio::test]
    async fn it_should_create_withdraw_action_successfully() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let amount = Nat::from(1_000u64);
        let actual_balance = Nat::from(900u64);
        let ledger_fee = Nat::from(10u64);
        let (link, canister_id, token_fee_service, mut token_balance_service) = test_fixture(
            creator,
            canister_id,
            vec![ledger_id],
            vec![amount],
            3,
            1_000_000,
        );
        token_fee_service
            .fetcher
            .set_fee(ledger_id, ledger_fee.clone());
        token_balance_service.set_balance(ledger_id, actual_balance.clone());

        // Act
        let result =
            WithdrawAction::create(&link, canister_id, token_fee_service, token_balance_service)
                .await;

        // Assert
        assert!(result.is_ok());
        let withdraw_action = result.unwrap();
        let action = withdraw_action.action;
        let intents = withdraw_action.intents;

        // Assert action
        assert_eq!(action.r#type, ActionType::Withdraw);
        assert_eq!(action.creator, creator);
        assert_eq!(action.link_id, link.id);

        // Assert intents
        assert_eq!(intents.len(), 1);
        let intent = &intents[0];
        assert_eq!(
            intent.label,
            generate_intent_asset_label(link.link_type, &Asset::IC { address: ledger_id })
        );

        let link_account = get_link_account(&link.id, canister_id).unwrap();
        match &intent.r#type {
            IntentType::Transfer(transfer_data) => {
                assert_eq!(transfer_data.from, link_account.into());
                assert_eq!(transfer_data.to, Wallet::new(creator));
                assert_eq!(transfer_data.amount, actual_balance - ledger_fee);
            }
            _ => panic!("Unexpected intent type: {:?}", intent.r#type),
        }
    }
}
