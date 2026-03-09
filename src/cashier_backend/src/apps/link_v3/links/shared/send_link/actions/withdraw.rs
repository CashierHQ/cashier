// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::{Nat, Principal};
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

use crate::apps::{
    link_v2::links::shared::utils::generate_intent_asset_label,
    link_v3::utils::link_v3_asset_principals, token_balance::traits::TokenBalanceFetcher,
    token_fee::traits::TokenFeeCache,
};
use uuid::Uuid;

#[derive(Debug)]
pub struct WithdrawActionV3 {
    pub action: ActionV3,
    pub intents: Vec<IntentV3>,
}

impl WithdrawActionV3 {
    pub fn new(action: ActionV3, intents: Vec<IntentV3>) -> Self {
        Self { action, intents }
    }

    /// Creates a new WithdrawActionV3 for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<WithdrawActionV3, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create<F, B>(
        link: &LinkV3,
        canister_id: Principal,
        created_at: u64,
        mut token_fee_service: F,
        token_balance_service: B,
    ) -> Result<Self, CanisterError>
    where
        F: TokenFeeCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        let action = ActionV3 {
            id: Uuid::new_v4().to_string(),
            action_type: ActionType::Withdraw,
            link_id: link.id.clone(),
            creator: link.creator,
            creator_address_type: AddressTypeV3::Creator,
            state: ActionState::Created,
            intent_ids: vec![],
        };

        let link_account = get_link_account(&link.id, canister_id)?;
        let asset_principals = link_v3_asset_principals(link);
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
                let sending_amount = actual_token_balance_map
                    .get(&asset_info.asset.address)
                    .cloned()
                    .unwrap_or(Nat::from(0u64));
                let fee_amount = token_fee_map
                    .get(&asset_info.asset.address)
                    .cloned()
                    .unwrap_or(Nat::from(0u64));
                let sending_amount = if sending_amount <= fee_amount {
                    Nat::from(0u64)
                } else {
                    sending_amount - fee_amount
                };

                let input = CreateLinkToWalletIntentArgs {
                    label: generate_intent_asset_label(link.link_type, asset_info.asset.address),
                    receiver_id: link.creator,
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
        action::v1::ActionState,
        asset::v1::Asset,
        asset::v3::{AssetV3, TokenStandardV3},
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
                token_standard: TokenStandardV3::ICRC1,
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
            state: LinkState::Inactive,
            created_at,
        }
    }

    fn fixture_of_services(current_ts: u64) -> (MockTokenFeeService, MockTokenBalanceService) {
        (
            create_mock_token_fee_service(current_ts),
            MockTokenBalanceService::new(),
        )
    }

    #[tokio::test]
    async fn it_should_fail_create_withdraw_action_due_to_invalid_link_id() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let ledger_id = random_principal_id();
        let mut link = fixture_of_link_v3(
            creator,
            vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1_000u64))],
            created_at,
        );
        link.id = "invalid-link-id".to_string();
        let (token_fee_service, token_balance_service) = fixture_of_services(created_at);

        // Act
        let result = WithdrawActionV3::create(
            &link,
            canister_id,
            created_at,
            token_fee_service,
            token_balance_service,
        )
        .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::UnknownError(_))));
    }

    #[tokio::test]
    async fn it_should_fail_create_withdraw_action_due_to_token_fee_service_error() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let ledger_id = random_principal_id();
        let link = fixture_of_link_v3(
            creator,
            vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1_000u64))],
            created_at,
        );
        let (token_fee_service, mut token_balance_service) = fixture_of_services(created_at);
        token_fee_service.fetcher.set_error(ledger_id, "fee unavailable");
        token_balance_service.set_balance(ledger_id, Nat::from(5_000u64));

        // Act
        let result = WithdrawActionV3::create(
            &link,
            canister_id,
            created_at,
            token_fee_service,
            token_balance_service,
        )
        .await;

        // Assert
        assert!(result.is_err());
        let err = result.expect_err("expected token fee service error");
        assert!(matches!(err, CanisterError::CallCanisterFailed(_)));
    }

    #[tokio::test]
    async fn it_should_fail_create_withdraw_action_due_to_missing_token_balance() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let ledger_id_1 = random_principal_id();
        let ledger_id_2 = random_principal_id();
        let link = fixture_of_link_v3(
            creator,
            vec![
                fixture_of_asset_info_v3(ledger_id_1, Nat::from(1_000u64)),
                fixture_of_asset_info_v3(ledger_id_2, Nat::from(2_000u64)),
            ],
            created_at,
        );
        let (token_fee_service, mut token_balance_service) = fixture_of_services(created_at);
        token_fee_service.fetcher.set_fee(ledger_id_1, Nat::from(100u64));
        token_fee_service.fetcher.set_fee(ledger_id_2, Nat::from(200u64));
        token_balance_service.set_balance(ledger_id_1, Nat::from(5_000u64));

        // Act
        let result = WithdrawActionV3::create(
            &link,
            canister_id,
            created_at,
            token_fee_service,
            token_balance_service,
        )
        .await;

        // Assert
        assert!(result.is_err());
        let err = result.expect_err("expected token balance service error");
        assert!(matches!(err, CanisterError::HandleLogicError(_)));
    }

    #[tokio::test]
    async fn it_should_succeed_create_withdraw_action() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let ledger_id_1 = random_principal_id();
        let ledger_id_2 = random_principal_id();
        let link = fixture_of_link_v3(
            creator,
            vec![
                fixture_of_asset_info_v3(ledger_id_1, Nat::from(1_000u64)),
                fixture_of_asset_info_v3(ledger_id_2, Nat::from(2_000u64)),
            ],
            created_at,
        );
        let (token_fee_service, mut token_balance_service) = fixture_of_services(created_at);
        token_fee_service.fetcher.set_fee(ledger_id_1, Nat::from(100u64));
        token_fee_service.fetcher.set_fee(ledger_id_2, Nat::from(200u64));
        token_balance_service.set_balance(ledger_id_1, Nat::from(5_000u64));
        token_balance_service.set_balance(ledger_id_2, Nat::from(150u64)); // <= fee -> zero sending

        // Act
        let result = WithdrawActionV3::create(
            &link,
            canister_id,
            created_at,
            token_fee_service,
            token_balance_service,
        )
        .await;

        // Assert
        assert!(result.is_ok());
        let withdraw_action = result.expect("withdraw action should succeed");
        assert_eq!(withdraw_action.action.action_type, ActionType::Withdraw);
        assert_eq!(withdraw_action.action.creator, creator);
        assert_eq!(
            withdraw_action.action.creator_address_type,
            AddressTypeV3::Creator
        );
        assert_eq!(withdraw_action.action.state, ActionState::Created);
        assert_eq!(withdraw_action.intents.len(), 2);

        let link_account = get_link_account(&link.id, canister_id).expect("link account valid");
        let intent_1 = withdraw_action
            .intents
            .iter()
            .find(|intent| intent.label == generate_intent_asset_label(link.link_type, ledger_id_1))
            .expect("intent for ledger 1 should exist");
        let intent_2 = withdraw_action
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
                assert_eq!(transfer_data.to, Wallet::new(creator));
                assert_eq!(
                    transfer_data.asset,
                    Asset::IC {
                        address: ledger_id_1
                    }
                );
                assert_eq!(transfer_data.amount, Nat::from(4_900u64));
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
                assert_eq!(transfer_data.to, Wallet::new(creator));
                assert_eq!(
                    transfer_data.asset,
                    Asset::IC {
                        address: ledger_id_2
                    }
                );
                assert_eq!(transfer_data.amount, Nat::from(0u64));
            }
            _ => panic!("expected Transfer intent transaction data for intent 2"),
        }
    }
}
