// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::INTENT_LABEL_LINK_CREATION_FEE,
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionState, ActionType},
        common::Asset,
        intent::v1::{
            CreateIcrc1WalletToLinkIntentArgs, CreateIcrc2WalletToLinkIntentArgs,
            CreateWalletToTreasuryIntentArgs, Intent,
        },
        link::v1::Link,
    },
};
use cashier_common::{constant::ICP_CANISTER_PRINCIPAL, utils::get_link_account};
use icrc_ledger_types::icrc1::account::Account;
use token_storage_types::token::IcrcStandard;
use transaction_manager::{
    intents::{
        transfer_wallet_to_link::TransferWalletToLinkIntent,
        transfer_wallet_to_treasury::TransferWalletToTreasuryIntent,
    },
    utils::calculator::{
        calculate_create_link_fee, calculate_icrc2_transfer_intent_amount,
        calculate_link_balance_map,
    },
};
use uuid::Uuid;

use crate::apps::{
    link_v2::links::shared::utils::{generate_intent_asset_label, link_asset_principals},
    token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

#[derive(Debug)]
pub struct CreateAction {
    pub action: Action,
    pub intents: Vec<Intent>,
}

impl CreateAction {
    pub fn new(action: Action, intents: Vec<Intent>) -> Self {
        Self { action, intents }
    }

    /// Creates a new CreateAction for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<CreateAction, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create<F, S>(
        link: &Link,
        canister_id: Principal,
        token_fee_service: &mut F,
        token_standard_service: &mut S,
    ) -> Result<Self, CanisterError>
    where
        F: TokenFeeCache,
        S: TokenStandardCache,
    {
        let action = Action {
            id: Uuid::new_v4().to_string(),
            r#type: ActionType::CreateLink,
            link_id: link.id.clone(),
            creator: link.creator,
            state: ActionState::Created,
        };

        let link_account = get_link_account(&link.id, canister_id)?;

        // lookup token fees and standards from caching services
        let asset_principals: Vec<Principal> = link_asset_principals(link);
        let token_fee_map = token_fee_service
            .get_batch_tokens_fee(&asset_principals)
            .await?;
        let token_standards_map = token_standard_service
            .get_batch_token_standards(&asset_principals)
            .await?;

        // precalculate token balance in the link
        let link_token_balance_map = calculate_link_balance_map(
            &link.asset_info,
            &token_fee_map,
            link.link_use_action_max_count,
        );

        // intents
        let deposit_intents = link
            .asset_info
            .iter()
            .map(|asset_info| {
                let asset_address = asset_info.get_asset_address();
                let token_standards = token_standards_map.get(&asset_address).ok_or_else(|| {
                    CanisterError::not_found(
                        "Token standards for asset",
                        &asset_address.to_string(),
                    )
                })?;

                if token_standards.contains(&IcrcStandard::ICRC2) {
                    let spender_account = Account {
                        owner: canister_id,
                        subaccount: None,
                    };

                    let (actual_amount, approval_amount) = calculate_icrc2_transfer_intent_amount(
                        link.link_use_action_max_count,
                        &asset_info.amount_per_link_use_action,
                        &asset_info.asset,
                        &token_fee_map,
                    )?;

                    let input = CreateIcrc2WalletToLinkIntentArgs {
                        label: generate_intent_asset_label(link.link_type, &asset_info.asset),
                        asset: asset_info.asset.clone(),
                        actual_amount,
                        approval_amount,
                        sender_id: link.creator,
                        link_account,
                        spender_account,
                        created_at_ts: link.create_at,
                    };

                    TransferWalletToLinkIntent::create_icrc2(input)
                } else {
                    let sending_amount =
                        link_token_balance_map.get(&asset_address).ok_or_else(|| {
                            CanisterError::HandleLogicError(
                                "Failed to get sending amount from balance map".to_string(),
                            )
                        })?;

                    let input = CreateIcrc1WalletToLinkIntentArgs {
                        label: generate_intent_asset_label(link.link_type, &asset_info.asset),
                        asset: asset_info.asset.clone(),
                        sending_amount: sending_amount.clone(),
                        sender_id: link.creator,
                        link_account,
                        created_at_ts: link.create_at,
                    };

                    TransferWalletToLinkIntent::create_icrc1(input)
                }
            })
            .collect::<Result<Vec<TransferWalletToLinkIntent>, CanisterError>>()?;

        let fee_asset = Asset::IC {
            address: ICP_CANISTER_PRINCIPAL,
        };
        let (actual_amount, approval_amount) = calculate_create_link_fee(&token_fee_map);
        let spender_account = Account {
            owner: canister_id,
            subaccount: None,
        };
        let input = CreateWalletToTreasuryIntentArgs {
            label: INTENT_LABEL_LINK_CREATION_FEE.to_string(),
            asset: fee_asset,
            actual_amount,
            approval_amount,
            sender_id: link.creator,
            spender_account,
            created_at_ts: link.create_at,
        };

        let fee_intent = TransferWalletToTreasuryIntent::create(input)?;

        let mut intents = Vec::<Intent>::new();
        deposit_intents.iter().for_each(|dintent| {
            intents.push(dintent.intent.clone());
        });
        intents.push(fee_intent.intent);

        Ok(Self::new(action, intents))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::apps::{
        token_fee::service::tests::{
            MockTokenFeeService, create_mock_service as create_mock_token_fee_service,
        },
        token_standard::service::tests::{
            MockTokenStandardService, create_mock_service as create_mock_token_standard_service,
        },
    };
    use candid::Nat;
    use cashier_backend_types::repository::{
        asset_info::AssetInfo,
        common::Wallet,
        intent::v1::{IntentTask, IntentType},
        link::v1::{LinkState, LinkType},
        token_fee,
    };
    use cashier_common::test_utils::random_principal_id;
    use transaction_manager::intents;
    use uuid::Uuid;

    /// Test fixture to create a Link and its dependencies for testing CreateAction
    /// # Arguments
    /// * `creator` - The principal ID of the link creator
    /// * `canister_id` - The principal ID of the canister
    /// * `ledger_ids` - A vector of ledger principal IDs for the assets in the
    /// * `amounts` - A vector of amounts corresponding to each ledger ID
    /// * `max_use` - The maximum use count for the link
    /// * `current_ts` - The current timestamp to set for the link creation
    /// # Returns
    /// * `(Link, Principal, MockTokenFeeService, MockTokenStandardService)` - A tuple containing the created Link, canister ID, and mock services for token fee and token standard
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
        MockTokenStandardService,
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
        let mut token_standard_service = create_mock_token_standard_service(current_ts);

        token_fee_service
            .fetcher
            .set_fee(ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(
                ICP_CANISTER_PRINCIPAL,
                vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2],
            );

        (link, canister_id, token_fee_service, token_standard_service)
    }

    #[tokio::test]
    async fn it_should_fail_create_action_if_token_fee_unavailable() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let current_ts = 1_000_000_000;
        let (link, canister_id, mut token_fee_service, mut token_standard_service) = test_fixture(
            creator,
            canister_id,
            vec![ledger_id1, ledger_id2],
            vec![Nat::from(100u64), Nat::from(200u64)],
            3,
            current_ts,
        );

        token_fee_service
            .fetcher
            .set_error(ledger_id1, "canister unavailable");

        // Act
        let result = CreateAction::create(
            &link,
            canister_id,
            &mut token_fee_service,
            &mut token_standard_service,
        )
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
    async fn it_should_fail_create_action_if_token_standard_unavailable() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let current_ts = 1_000_000_000;
        let (link, canister_id, mut token_fee_service, mut token_standard_service) = test_fixture(
            creator,
            canister_id,
            vec![ledger_id1, ledger_id2],
            vec![Nat::from(100u64), Nat::from(200u64)],
            3,
            current_ts,
        );
        token_fee_service
            .fetcher
            .set_fee(ledger_id1, Nat::from(100u64));
        token_fee_service
            .fetcher
            .set_fee(ledger_id2, Nat::from(200u64));

        // Act
        let result = CreateAction::create(
            &link,
            canister_id,
            &mut token_fee_service,
            &mut token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_err());
        let err = result.err().unwrap();
        if let CanisterError::NotFound(err_msg) = err {
            assert!(err_msg.contains("Token standards"));
        } else {
            panic!("Unexpected error type: {:?}", err);
        }
    }

    #[tokio::test]
    async fn it_should_success_create_action_with_icrc1_intent_if_token_standard_icrc1() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_fee = Nat::from(100u64);
        let amount = Nat::from(10_000u64);
        let max_use = 3;
        let current_ts = 1_000_000_000;
        let (link, canister_id, mut token_fee_service, mut token_standard_service) = test_fixture(
            creator,
            canister_id,
            vec![ledger_id1],
            vec![amount.clone()],
            max_use,
            current_ts,
        );

        token_fee_service
            .fetcher
            .set_fee(ledger_id1, ledger_fee.clone());
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id1, vec![IcrcStandard::ICRC1]);

        let token_fee_map = token_fee_service
            .get_batch_tokens_fee(&[ledger_id1, ICP_CANISTER_PRINCIPAL])
            .await
            .unwrap();
        let link_token_balance_map =
            calculate_link_balance_map(&link.asset_info, &token_fee_map, max_use);

        // Act
        let result = CreateAction::create(
            &link,
            canister_id,
            &mut token_fee_service,
            &mut token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_ok());
        let create_action = result.ok().unwrap();

        let action = create_action.action;
        let intents = create_action.intents;

        // Assert action
        assert_eq!(action.r#type, ActionType::CreateLink);
        assert_eq!(action.creator, creator);
        assert_eq!(action.state, ActionState::Created);

        // Assert intents
        assert_eq!(intents.len(), 2); // 1 deposit + 1 fee intent

        // Assert deposit intent
        let wallet_to_link_intent = &intents
            .iter()
            .find(|intent| matches!(intent.task, IntentTask::TransferWalletToLink));
        assert!(wallet_to_link_intent.is_some());
        let wallet_to_link_intent = wallet_to_link_intent.unwrap();
        let link_account = get_link_account(&link.id, canister_id).unwrap();

        match &wallet_to_link_intent.r#type {
            IntentType::Transfer(transfer_data) => {
                assert_eq!(transfer_data.from, Wallet::new(creator));
                assert_eq!(transfer_data.to, link_account.into());
                assert_eq!(
                    transfer_data.asset,
                    Asset::IC {
                        address: ledger_id1
                    }
                );
                assert_eq!(
                    transfer_data.amount,
                    link_token_balance_map
                        .get(&ledger_id1)
                        .cloned()
                        .unwrap_or_default(),
                    "Transfer amount incorrect"
                );
            }
            _ => {
                panic!("Unexpected intent type: {:?}", wallet_to_link_intent.r#type);
            }
        }

        // Assert fee intent
        let fee_intent = &intents
            .iter()
            .find(|intent| matches!(intent.task, IntentTask::TransferWalletToTreasury));
        assert!(fee_intent.is_some());
        let fee_intent = fee_intent.unwrap();
        match &fee_intent.r#type {
            IntentType::TransferFrom(transfer_from_data) => {
                assert_eq!(
                    transfer_from_data.asset,
                    Asset::IC {
                        address: ICP_CANISTER_PRINCIPAL
                    }
                );
                assert_eq!(
                    transfer_from_data.amount,
                    calculate_create_link_fee(
                        &token_fee_service
                            .get_batch_tokens_fee(&[ledger_id1, ICP_CANISTER_PRINCIPAL])
                            .await
                            .unwrap()
                    )
                    .0,
                    "Fee transfer amount incorrect"
                );
            }
            _ => {
                panic!("Unexpected intent type: {:?}", fee_intent.r#type);
            }
        }
    }

    #[tokio::test]
    async fn it_should_success_create_action_with_icrc2_intent_if_token_standard_icrc2() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_fee = Nat::from(100u64);
        let amount = Nat::from(10_000u64);
        let max_use = 3;
        let current_ts = 1_000_000_000;
        let (link, canister_id, mut token_fee_service, mut token_standard_service) = test_fixture(
            creator,
            canister_id,
            vec![ledger_id1],
            vec![amount.clone()],
            max_use,
            current_ts,
        );

        token_fee_service
            .fetcher
            .set_fee(ledger_id1, ledger_fee.clone());
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id1, vec![IcrcStandard::ICRC1, IcrcStandard::ICRC2]);

        let token_fee_map = token_fee_service
            .get_batch_tokens_fee(&[ledger_id1, ICP_CANISTER_PRINCIPAL])
            .await
            .unwrap();
        let _link_token_balance_map =
            calculate_link_balance_map(&link.asset_info, &token_fee_map, max_use);

        // Act
        let result = CreateAction::create(
            &link,
            canister_id,
            &mut token_fee_service,
            &mut token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_ok());
        let create_action = result.ok().unwrap();

        let action = create_action.action;
        let intents = create_action.intents;

        // Assert action
        assert_eq!(action.r#type, ActionType::CreateLink);
        assert_eq!(action.creator, creator);
        assert_eq!(action.state, ActionState::Created);

        // Assert intents
        assert_eq!(intents.len(), 2); // 1 deposit + 1 fee intent

        // Assert deposit intent
        let wallet_to_link_intent = &intents
            .iter()
            .find(|intent| matches!(intent.task, IntentTask::TransferWalletToLink));
        assert!(wallet_to_link_intent.is_some());
        let wallet_to_link_intent = wallet_to_link_intent.unwrap();
        let link_account = get_link_account(&link.id, canister_id).unwrap();
        let spender_account = Account {
            owner: canister_id,
            subaccount: None,
        };
        let asset = Asset::IC {
            address: ledger_id1,
        };

        match &wallet_to_link_intent.r#type {
            IntentType::TransferFrom(transfer_from_data) => {
                assert_eq!(transfer_from_data.from, Wallet::new(creator));
                assert_eq!(transfer_from_data.to, link_account.into());
                assert_eq!(transfer_from_data.spender, spender_account.into());
                assert_eq!(transfer_from_data.asset, asset);
                assert_eq!(
                    transfer_from_data.amount,
                    calculate_icrc2_transfer_intent_amount(
                        max_use,
                        &amount,
                        &asset,
                        &token_fee_map,
                    )
                    .unwrap()
                    .0,
                    "Asset transfer amount incorrect"
                );
            }
            _ => {
                panic!("Unexpected intent type: {:?}", wallet_to_link_intent.r#type);
            }
        }

        // Assert fee intent
        let fee_intent = &intents
            .iter()
            .find(|intent| matches!(intent.task, IntentTask::TransferWalletToTreasury));
        assert!(fee_intent.is_some());
        let fee_intent = fee_intent.unwrap();
        match &fee_intent.r#type {
            IntentType::TransferFrom(transfer_from_data) => {
                assert_eq!(
                    transfer_from_data.asset,
                    Asset::IC {
                        address: ICP_CANISTER_PRINCIPAL
                    }
                );
                assert_eq!(
                    transfer_from_data.amount,
                    calculate_create_link_fee(
                        &token_fee_service
                            .get_batch_tokens_fee(&[ledger_id1, ICP_CANISTER_PRINCIPAL])
                            .await
                            .unwrap()
                    )
                    .0,
                    "Fee transfer amount incorrect"
                );
            }
            _ => {
                panic!("Unexpected intent type: {:?}", fee_intent.r#type);
            }
        }
    }

    #[tokio::test]
    async fn it_should_success_create_action_with_assets_with_different_standards() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id1 = random_principal_id();
        let ledger_id2 = random_principal_id();
        let ledger_fee = Nat::from(100u64);
        let amount1 = Nat::from(10_000u64);
        let amount2 = Nat::from(20_000u64);
        let max_use = 3;
        let current_ts = 1_000_000_000;
        let (link, canister_id, mut token_fee_service, mut token_standard_service) = test_fixture(
            creator,
            canister_id,
            vec![ledger_id1, ledger_id2],
            vec![amount1.clone(), amount2.clone()],
            max_use,
            current_ts,
        );

        token_fee_service
            .fetcher
            .set_fee(ledger_id1, ledger_fee.clone());
        token_fee_service
            .fetcher
            .set_fee(ledger_id2, ledger_fee.clone());
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id1, vec![IcrcStandard::ICRC1]);
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id2, vec![IcrcStandard::ICRC2]);

        let token_fee_map = token_fee_service
            .get_batch_tokens_fee(&[ledger_id1, ledger_id2, ICP_CANISTER_PRINCIPAL])
            .await
            .unwrap();
        let link_token_balance_map =
            calculate_link_balance_map(&link.asset_info, &token_fee_map, max_use);

        // Act
        let result = CreateAction::create(
            &link,
            canister_id,
            &mut token_fee_service,
            &mut token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_ok());
        let create_action = result.ok().unwrap();
        let action = create_action.action;
        let intents = create_action.intents;

        // Assert action
        assert_eq!(action.r#type, ActionType::CreateLink);
        assert_eq!(action.creator, creator);
        assert_eq!(action.state, ActionState::Created);

        // Assert intents
        assert_eq!(intents.len(), 3); // 2 deposit + 1 fee intent

        // Assert leger_id1 intent (ICRC1)
        let intent1 = &intents.iter().find(|intent| {
            matches!(intent.task, IntentTask::TransferWalletToLink)
                && intent.label
                    == generate_intent_asset_label(
                        link.link_type,
                        &Asset::IC {
                            address: ledger_id1,
                        },
                    )
        });
        assert!(intent1.is_some());
        let intent1 = intent1.unwrap();
        let link_account = get_link_account(&link.id, canister_id).unwrap();

        match &intent1.r#type {
            IntentType::Transfer(transfer_data) => {
                assert_eq!(transfer_data.from, Wallet::new(creator));
                assert_eq!(transfer_data.to, link_account.into());
                assert_eq!(
                    transfer_data.asset,
                    Asset::IC {
                        address: ledger_id1
                    }
                );
                assert_eq!(
                    transfer_data.amount,
                    link_token_balance_map
                        .get(&ledger_id1)
                        .cloned()
                        .unwrap_or_default(),
                    "Transfer amount incorrect for ledger_id1"
                );
            }
            _ => {
                panic!("Unexpected intent type: {:?}", intent1.r#type);
            }
        }

        // Assert leger_id2 intent (ICRC2)
        let intent2 = &intents.iter().find(|intent| {
            matches!(intent.task, IntentTask::TransferWalletToLink)
                && intent.label
                    == generate_intent_asset_label(
                        link.link_type,
                        &Asset::IC {
                            address: ledger_id2,
                        },
                    )
        });
        assert!(intent2.is_some());
        let intent2 = intent2.unwrap();
        let spender_account = Account {
            owner: canister_id,
            subaccount: None,
        };
        let asset = Asset::IC {
            address: ledger_id2,
        };

        match &intent2.r#type {
            IntentType::TransferFrom(transfer_from_data) => {
                assert_eq!(transfer_from_data.from, Wallet::new(creator));
                assert_eq!(transfer_from_data.to, link_account.into());
                assert_eq!(transfer_from_data.spender, spender_account.into());
                assert_eq!(transfer_from_data.asset, asset);
                assert_eq!(
                    transfer_from_data.amount,
                    calculate_icrc2_transfer_intent_amount(
                        max_use,
                        &amount2,
                        &asset,
                        &token_fee_map,
                    )
                    .unwrap()
                    .0,
                    "Asset transfer amount incorrect for ledger_id2"
                );
            }
            _ => {
                panic!("Unexpected intent type: {:?}", intent2.r#type);
            }
        }

        // Assert fee intent
        let fee_intent = &intents
            .iter()
            .find(|intent| matches!(intent.task, IntentTask::TransferWalletToTreasury));
        assert!(fee_intent.is_some());
        let fee_intent = fee_intent.unwrap();
        match &fee_intent.r#type {
            IntentType::TransferFrom(transfer_from_data) => {
                assert_eq!(
                    transfer_from_data.asset,
                    Asset::IC {
                        address: ICP_CANISTER_PRINCIPAL,
                    },
                );
                assert_eq!(
                    transfer_from_data.amount,
                    calculate_create_link_fee(
                        &token_fee_service
                            .get_batch_tokens_fee(&[ledger_id1, ledger_id2, ICP_CANISTER_PRINCIPAL])
                            .await
                            .unwrap()
                    )
                    .0,
                    "Fee transfer amount incorrect"
                );
            }
            _ => {
                panic!("Unexpected intent type: {:?}", fee_intent.r#type);
            }
        }
    }
}
