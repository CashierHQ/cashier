// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::{
    constant::{INTENT_LABEL_GATE_FEE, INTENT_LABEL_LINK_CREATION_FEE},
    error::CanisterError,
    repository::{
        action::{
            v1::{ActionState, ActionType},
            v3::ActionV3,
        },
        asset::v3::{AssetV3, TokenStandardV3},
        common::AddressTypeV3,
        intent::v3::{
            CreateIcrc1WalletToLinkIntentArgs, CreateIcrc2WalletToLinkIntentArgs,
            CreateWalletToTreasuryIntentArgs, IntentV3,
        },
        link::v3::LinkV3,
    },
};
use cashier_common::{
    constant::{FEE_TREASURY_PRINCIPAL, ICP_CANISTER_PRINCIPAL},
    utils::get_link_account,
};
use icrc_ledger_types::icrc1::account::Account;
use token_storage_types::token::IcrcStandard;
use transaction_manager::{
    intents::v3::{
        transfer_wallet_to_link::TransferWalletToLinkIntent,
        transfer_wallet_to_treasury::TransferWalletToTreasuryIntent,
    },
    utils::calculator::{
        calculate_create_link_fee, calculate_gate_fee, calculate_icrc1_transfer_intent_amount,
        calculate_icrc2_transfer_intent_amount,
    },
};
use uuid::Uuid;

use crate::apps::{
    link_v2::links::shared::utils::generate_intent_asset_label,
    link_v3::utils::link_v3_asset_principals, token_fee::traits::TokenFeeCache,
    token_standard::traits::TokenStandardCache,
};

#[derive(Debug)]
pub struct CreateActionV3 {
    pub action: ActionV3,
    pub intents: Vec<IntentV3>,
}

impl CreateActionV3 {
    pub fn new(action: ActionV3, intents: Vec<IntentV3>) -> Self {
        Self { action, intents }
    }

    /// Creates a new CreateActionV3 for a given Link.
    /// # Arguments
    /// * `link` - The Link for which the action is created.
    /// * `canister_id` - The canister ID of the token contract.
    /// # Returns
    /// * `Result<CreateActionV3, CanisterError>` - The resulting action or an error if the creation fails.
    pub async fn create<F, S>(
        link: &LinkV3,
        canister_id: Principal,
        created_at: u64,
        gate_count: u64,
        mut token_fee_service: F,
        mut token_standard_service: S,
    ) -> Result<Self, CanisterError>
    where
        F: TokenFeeCache,
        S: TokenStandardCache,
    {
        let mut action = ActionV3 {
            id: Uuid::new_v4().to_string(),
            action_type: ActionType::CreateLink,
            link_id: link.id.clone(),
            creator: link.creator,
            creator_address_type: AddressTypeV3::Creator,
            state: ActionState::Created,
            intent_ids: vec![],
        };

        let link_account = get_link_account(&link.id, canister_id)?;
        // lookup token fees and standards from caching services
        let asset_principals: Vec<Principal> = link_v3_asset_principals(link);
        let token_fee_map = token_fee_service
            .get_batch_tokens_fee(&asset_principals)
            .await?;
        let token_standards_map = token_standard_service
            .get_batch_token_standards(&asset_principals)
            .await?;

        // deposit intents Creator -> Link
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

                let token_network_fee = token_fee_map.get(&asset_address).ok_or_else(|| {
                    CanisterError::not_found(
                        "Token network fee for asset",
                        &asset_address.to_string(),
                    )
                })?;

                if token_standards.contains(&IcrcStandard::ICRC2) {
                    let spender_account = Account {
                        owner: canister_id,
                        subaccount: None,
                    };

                    let (actual_amount, approval_amount) = calculate_icrc2_transfer_intent_amount(
                        link.max_use,
                        &asset_info.amount,
                        asset_info.asset.address,
                        &token_fee_map,
                    )?;

                    let deposit_asset = AssetV3 {
                        address: asset_info.asset.address,
                        network_fee: Some(token_network_fee.clone()),
                        token_standard: TokenStandardV3::ICRC2,
                    };

                    let input = CreateIcrc2WalletToLinkIntentArgs {
                        label: generate_intent_asset_label(
                            link.link_type,
                            asset_info.asset.address,
                        ),
                        asset: deposit_asset,
                        user_ui_input_asset_amount: asset_info.amount.clone(),
                        max_use: link.max_use,
                        actual_amount,
                        approval_amount,
                        sender_id: link.creator,
                        receiver_id: canister_id,
                        link_account,
                        spender_account,
                        created_at_ts: created_at,
                    };

                    TransferWalletToLinkIntent::create_icrc2(&action.id, input)
                } else {
                    let (actual_amount, _total_amount) = calculate_icrc1_transfer_intent_amount(
                        link.max_use,
                        &asset_info.amount,
                        asset_info.asset.address,
                        &token_fee_map,
                    )?;

                    let deposit_asset = AssetV3 {
                        address: asset_info.asset.address,
                        network_fee: Some(token_network_fee.clone()),
                        token_standard: TokenStandardV3::ICRC1,
                    };

                    let input = CreateIcrc1WalletToLinkIntentArgs {
                        label: generate_intent_asset_label(
                            link.link_type,
                            asset_info.asset.address,
                        ),
                        asset: deposit_asset,
                        user_ui_input_asset_amount: asset_info.amount.clone(),
                        max_use: link.max_use,
                        sending_amount: actual_amount,
                        sender_id: link.creator,
                        receiver_id: canister_id,
                        link_account,
                        created_at_ts: created_at,
                    };

                    TransferWalletToLinkIntent::create_icrc1(&action.id, input)
                }
            })
            .collect::<Result<Vec<TransferWalletToLinkIntent>, CanisterError>>()?;

        // Creation link fee intent Creator -> Treasury
        let fee_asset = AssetV3 {
            address: ICP_CANISTER_PRINCIPAL,
            network_fee: token_fee_map.get(&ICP_CANISTER_PRINCIPAL).cloned(),
            token_standard: TokenStandardV3::ICRC2,
        };
        let (actual_amount, approval_amount) = calculate_create_link_fee(&token_fee_map);
        let spender_account = Account {
            owner: canister_id,
            subaccount: None,
        };
        let input = CreateWalletToTreasuryIntentArgs {
            label: INTENT_LABEL_LINK_CREATION_FEE.to_string(),
            asset: fee_asset.clone(),
            actual_amount,
            approval_amount,
            sender_id: link.creator,
            spender_account,
            receiver_id: canister_id,
            dest_address_type: AddressTypeV3::Treasury,
            created_at_ts: link.created_at,
        };

        let fee_intent = TransferWalletToTreasuryIntent::create(&action.id, input)?;

        let gate_fee_intent = if gate_count > 0 {
            let (actual_amount, approval_amount) =
                calculate_gate_fee(gate_count, link.max_use, &token_fee_map);
            let input = CreateWalletToTreasuryIntentArgs {
                label: INTENT_LABEL_GATE_FEE.to_string(),
                asset: fee_asset,
                actual_amount,
                approval_amount,
                sender_id: link.creator,
                spender_account,
                receiver_id: FEE_TREASURY_PRINCIPAL,
                dest_address_type: AddressTypeV3::Gate,
                created_at_ts: link.created_at,
            };

            Some(TransferWalletToTreasuryIntent::create(&action.id, input)?)
        } else {
            None
        };

        let mut intents = Vec::<IntentV3>::new();
        deposit_intents.iter().for_each(|dintent| {
            intents.push(dintent.intent.clone());
        });
        intents.push(fee_intent.intent);
        if let Some(gate_fee_intent) = gate_fee_intent {
            intents.push(gate_fee_intent.intent);
        }

        // enrich action with intent ids
        let intent_ids = intents.iter().map(|intent| intent.id.clone()).collect();
        action.intent_ids = intent_ids;

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
        action::v1::ActionState, asset_info::v3::AssetInfoV3, common::Wallet,
        intent::v3::IntentTransactionDataV3, link::v1::LinkType,
    };
    use cashier_common::test_utils::random_principal_id;
    use std::collections::HashMap;
    use uuid::Uuid;

    fn assert_action_intent_ids_match_intents(action: &ActionV3, intents: &[IntentV3]) {
        let expected_intent_ids: Vec<String> =
            intents.iter().map(|intent| intent.id.clone()).collect();
        assert_eq!(action.intent_ids, expected_intent_ids);
    }

    fn fixture_of_asset_info_v3(address: Principal, amount: Nat) -> AssetInfoV3 {
        AssetInfoV3 {
            asset: AssetV3 {
                address,
                network_fee: None,
                token_standard: TokenStandardV3::ICRC1,
            },
            label: "asset".to_string(),
            amount,
            available_amount: None,
        }
    }

    fn fixture_of_link_v3(
        creator: Principal,
        asset_info: Vec<AssetInfoV3>,
        max_use: u64,
        created_at: u64,
    ) -> LinkV3 {
        LinkV3 {
            id: Uuid::new_v4().to_string(),
            title: "Test Link V3".to_string(),
            link_type: LinkType::SendTip,
            asset_info,
            max_use,
            use_count: 0,
            creator,
            state: cashier_backend_types::repository::link::v3::LinkState::Created,
            created_at,
        }
    }

    fn fixture_of_services(current_ts: u64) -> (MockTokenFeeService, MockTokenStandardService) {
        (
            create_mock_token_fee_service(current_ts),
            create_mock_token_standard_service(current_ts),
        )
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_invalid_link_id() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let asset_info = vec![fixture_of_asset_info_v3(ledger_id, Nat::from(10_000u64))];
        let mut link = fixture_of_link_v3(creator, asset_info, 3, created_at);
        link.id = "invalid-link-id".to_string();
        let (token_fee_service, mut token_standard_service) = fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_fee_service
            .fetcher
            .set_fee(ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act
        let result = CreateActionV3::create(
            &link,
            canister_id,
            created_at,
            0,
            token_fee_service,
            token_standard_service,
        )
        .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::UnknownError(_))));
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_token_fee_service_error() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let asset_info = vec![fixture_of_asset_info_v3(ledger_id, Nat::from(10_000u64))];
        let link = fixture_of_link_v3(creator, asset_info, 3, created_at);
        let (token_fee_service, mut token_standard_service) = fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_error(ledger_id, "canister unavailable");
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act
        let result = CreateActionV3::create(
            &link,
            canister_id,
            created_at,
            0,
            token_fee_service,
            token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_err());
        let err = result.expect_err("expected token fee service error");
        assert!(matches!(err, CanisterError::CallCanisterFailed(_)));
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_missing_token_standard() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let asset_info = vec![fixture_of_asset_info_v3(ledger_id, Nat::from(10_000u64))];
        let link = fixture_of_link_v3(creator, asset_info, 3, created_at);
        let (token_fee_service, token_standard_service) = fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));

        // Act
        let result = CreateActionV3::create(
            &link,
            canister_id,
            created_at,
            0,
            token_fee_service,
            token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_err());
        let err = result.expect_err("expected missing token standard error");
        assert!(matches!(err, CanisterError::NotFound(_)));
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_with_icrc1_deposit_intent() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let amount = Nat::from(10_000u64);
        let max_use = 3u64;
        let asset_info = vec![fixture_of_asset_info_v3(ledger_id, amount.clone())];
        let link = fixture_of_link_v3(creator, asset_info, max_use, created_at);
        let (token_fee_service, mut token_standard_service) = fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act
        let result = CreateActionV3::create(
            &link,
            canister_id,
            created_at,
            0,
            token_fee_service,
            token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_ok());
        let created = result.expect("create action should succeed");
        assert_eq!(created.action.action_type, ActionType::CreateLink);
        assert_eq!(created.action.creator, creator);
        assert_eq!(created.action.state, ActionState::Created);
        assert_eq!(created.intents.len(), 2);
        assert_action_intent_ids_match_intents(&created.action, &created.intents);

        let deposit_intent = created
            .intents
            .iter()
            .find(|intent| intent.label == generate_intent_asset_label(link.link_type, ledger_id))
            .expect("deposit intent should exist");
        assert_eq!(deposit_intent.asset.token_standard, TokenStandardV3::ICRC1);
        assert_eq!(deposit_intent.asset.network_fee, Some(Nat::from(100u64)));
        let fee_map: HashMap<Principal, Nat> = vec![
            (ledger_id, Nat::from(100u64)),
            (ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64)),
        ]
        .into_iter()
        .collect();
        let expected_actual_amount =
            calculate_icrc1_transfer_intent_amount(max_use, &amount, ledger_id, &fee_map)
                .expect("expected ICRC1 amount calculation success")
                .0;

        match deposit_intent
            .intent_tx_data
            .clone()
            .expect("deposit intent tx data should exist")
        {
            IntentTransactionDataV3::Transfer(transfer_data) => {
                assert_eq!(transfer_data.amount, expected_actual_amount);
                assert_eq!(transfer_data.asset.get_address(), ledger_id);
                assert_eq!(transfer_data.from, Wallet::new(creator));
                assert_eq!(
                    transfer_data.to,
                    get_link_account(&link.id, canister_id)
                        .expect("link account should be valid")
                        .into()
                );
            }
            _ => panic!("expected Transfer intent transaction data for ICRC1"),
        }

        let fee_intent = created
            .intents
            .iter()
            .find(|intent| intent.label == INTENT_LABEL_LINK_CREATION_FEE)
            .expect("fee intent should exist");
        assert_eq!(fee_intent.asset.token_standard, TokenStandardV3::ICRC2);
        assert_eq!(fee_intent.asset.network_fee, None);
        let (expected_fee_actual_amount, expected_fee_approval_amount) =
            calculate_create_link_fee(&fee_map);
        match fee_intent
            .intent_tx_data
            .clone()
            .expect("fee intent tx data should exist")
        {
            IntentTransactionDataV3::TransferFrom(transfer_from_data) => {
                assert_eq!(transfer_from_data.amount, expected_fee_actual_amount);
                assert_eq!(
                    transfer_from_data.approve_amount,
                    Some(expected_fee_approval_amount)
                );
                assert_eq!(
                    transfer_from_data.actual_amount,
                    Some(expected_fee_actual_amount)
                );
                assert_eq!(
                    transfer_from_data.asset.get_address(),
                    ICP_CANISTER_PRINCIPAL
                );
                assert_eq!(transfer_from_data.from, Wallet::new(creator));
                assert_eq!(
                    transfer_from_data.spender,
                    Wallet::from(Account {
                        owner: canister_id,
                        subaccount: None,
                    })
                );
            }
            _ => panic!("expected TransferFrom intent transaction data for fee intent"),
        }
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_with_icrc2_deposit_intent() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let amount = Nat::from(20_000u64);
        let max_use = 3u64;
        let asset_info = vec![fixture_of_asset_info_v3(ledger_id, amount.clone())];
        let link = fixture_of_link_v3(creator, asset_info, max_use, created_at);
        let (token_fee_service, mut token_standard_service) = fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(200u64));
        token_fee_service
            .fetcher
            .set_fee(ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC2]);

        // Act
        let result = CreateActionV3::create(
            &link,
            canister_id,
            created_at,
            0,
            token_fee_service,
            token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_ok());
        let created = result.expect("create action should succeed");
        assert_eq!(created.action.action_type, ActionType::CreateLink);
        assert_eq!(created.action.creator, creator);
        assert_eq!(created.action.state, ActionState::Created);
        assert_eq!(created.intents.len(), 2);
        assert_action_intent_ids_match_intents(&created.action, &created.intents);

        let deposit_intent = created
            .intents
            .iter()
            .find(|intent| intent.label == generate_intent_asset_label(link.link_type, ledger_id))
            .expect("deposit intent should exist");
        assert_eq!(deposit_intent.asset.token_standard, TokenStandardV3::ICRC2);
        assert_eq!(deposit_intent.asset.network_fee, Some(Nat::from(200u64)));
        let fee_map: HashMap<Principal, Nat> = vec![
            (ledger_id, Nat::from(200u64)),
            (ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64)),
        ]
        .into_iter()
        .collect();
        let (expected_actual_amount, expected_approval_amount) =
            calculate_icrc2_transfer_intent_amount(max_use, &amount, ledger_id, &fee_map)
                .expect("expected ICRC2 amount calculation success");

        match deposit_intent
            .intent_tx_data
            .clone()
            .expect("deposit intent tx data should exist")
        {
            IntentTransactionDataV3::TransferFrom(transfer_from_data) => {
                assert_eq!(transfer_from_data.amount, expected_actual_amount);
                assert_eq!(
                    transfer_from_data.approve_amount,
                    Some(expected_approval_amount)
                );
                assert_eq!(
                    transfer_from_data.actual_amount,
                    Some(expected_actual_amount)
                );
                assert_eq!(transfer_from_data.asset.get_address(), ledger_id);
                assert_eq!(transfer_from_data.from, Wallet::new(creator));
                assert_eq!(
                    transfer_from_data.to,
                    get_link_account(&link.id, canister_id)
                        .expect("link account should be valid")
                        .into()
                );
                assert_eq!(
                    transfer_from_data.spender,
                    Wallet::from(Account {
                        owner: canister_id,
                        subaccount: None,
                    })
                );
            }
            _ => panic!("expected TransferFrom intent transaction data for ICRC2"),
        }

        let fee_intent = created
            .intents
            .iter()
            .find(|intent| intent.label == INTENT_LABEL_LINK_CREATION_FEE)
            .expect("fee intent should exist");
        assert_eq!(fee_intent.asset.token_standard, TokenStandardV3::ICRC2);
        assert_eq!(fee_intent.asset.network_fee, None);
        let (expected_fee_actual_amount, expected_fee_approval_amount) =
            calculate_create_link_fee(&fee_map);
        match fee_intent
            .intent_tx_data
            .clone()
            .expect("fee intent tx data should exist")
        {
            IntentTransactionDataV3::TransferFrom(transfer_from_data) => {
                assert_eq!(transfer_from_data.amount, expected_fee_actual_amount);
                assert_eq!(
                    transfer_from_data.approve_amount,
                    Some(expected_fee_approval_amount)
                );
                assert_eq!(
                    transfer_from_data.actual_amount,
                    Some(expected_fee_actual_amount)
                );
                assert_eq!(
                    transfer_from_data.asset.get_address(),
                    ICP_CANISTER_PRINCIPAL
                );
                assert_eq!(transfer_from_data.from, Wallet::new(creator));
                assert_eq!(
                    transfer_from_data.spender,
                    Wallet::from(Account {
                        owner: canister_id,
                        subaccount: None,
                    })
                );
            }
            _ => panic!("expected TransferFrom intent transaction data for fee intent"),
        }
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_with_gate_fee_intent() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000_000u64;
        let amount = Nat::from(20_000u64);
        let max_use = 3u64;
        let gate_count = 2u64;
        let asset_info = vec![fixture_of_asset_info_v3(ledger_id, amount)];
        let link = fixture_of_link_v3(creator, asset_info, max_use, created_at);
        let (token_fee_service, mut token_standard_service) = fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(200u64));
        token_fee_service
            .fetcher
            .set_fee(ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC2]);

        // Act
        let result = CreateActionV3::create(
            &link,
            canister_id,
            created_at,
            gate_count,
            token_fee_service,
            token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_ok());
        let created = result.expect("create action should succeed");
        assert_eq!(created.intents.len(), 3);
        assert_action_intent_ids_match_intents(&created.action, &created.intents);

        let gate_fee_intent = created
            .intents
            .iter()
            .find(|intent| intent.label == INTENT_LABEL_GATE_FEE)
            .expect("gate fee intent should exist");
        assert_eq!(gate_fee_intent.source_address_type, AddressTypeV3::Creator);
        assert_eq!(gate_fee_intent.dest_address_type, AddressTypeV3::Gate);
        assert_eq!(gate_fee_intent.dest_address, FEE_TREASURY_PRINCIPAL);
        assert_eq!(gate_fee_intent.asset.address, ICP_CANISTER_PRINCIPAL);

        let fee_map: HashMap<Principal, Nat> = vec![
            (ledger_id, Nat::from(200u64)),
            (ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64)),
        ]
        .into_iter()
        .collect();
        let (expected_actual_amount, expected_approval_amount) =
            calculate_gate_fee(gate_count, max_use, &fee_map);
        assert_eq!(expected_actual_amount, Nat::from(800_000u64));

        match gate_fee_intent
            .intent_tx_data
            .clone()
            .expect("gate fee intent tx data should exist")
        {
            IntentTransactionDataV3::TransferFrom(transfer_from_data) => {
                assert_eq!(transfer_from_data.amount, expected_actual_amount);
                assert_eq!(
                    transfer_from_data.approve_amount,
                    Some(expected_approval_amount)
                );
                assert_eq!(
                    transfer_from_data.actual_amount,
                    Some(expected_actual_amount)
                );
                assert_eq!(
                    transfer_from_data.asset.get_address(),
                    ICP_CANISTER_PRINCIPAL
                );
                assert_eq!(transfer_from_data.from, Wallet::new(creator));
                assert_eq!(
                    transfer_from_data.to,
                    Wallet::from(Account {
                        owner: FEE_TREASURY_PRINCIPAL,
                        subaccount: None,
                    })
                );
                assert_eq!(
                    transfer_from_data.spender,
                    Wallet::from(Account {
                        owner: canister_id,
                        subaccount: None,
                    })
                );
            }
            _ => panic!("expected TransferFrom intent transaction data for gate fee intent"),
        }
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_with_mixed_icrc1_and_icrc2_deposit_intents() {
        // Arrange
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_icrc1 = random_principal_id();
        let ledger_icrc2 = random_principal_id();
        let created_at = 1_000_000_000u64;
        let amount_icrc1 = Nat::from(10_000u64);
        let amount_icrc2 = Nat::from(20_000u64);
        let max_use = 3u64;
        let asset_info = vec![
            fixture_of_asset_info_v3(ledger_icrc1, amount_icrc1.clone()),
            fixture_of_asset_info_v3(ledger_icrc2, amount_icrc2.clone()),
        ];
        let link = fixture_of_link_v3(creator, asset_info, max_use, created_at);
        let (token_fee_service, mut token_standard_service) = fixture_of_services(created_at);
        token_fee_service
            .fetcher
            .set_fee(ledger_icrc1, Nat::from(100u64));
        token_fee_service
            .fetcher
            .set_fee(ledger_icrc2, Nat::from(200u64));
        token_fee_service
            .fetcher
            .set_fee(ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_icrc1, vec![IcrcStandard::ICRC1]);
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_icrc2, vec![IcrcStandard::ICRC2]);

        // Act
        let result = CreateActionV3::create(
            &link,
            canister_id,
            created_at,
            0,
            token_fee_service,
            token_standard_service,
        )
        .await;

        // Assert
        assert!(result.is_ok());
        let created = result.expect("create action should succeed");
        assert_eq!(created.intents.len(), 3);
        assert_action_intent_ids_match_intents(&created.action, &created.intents);

        let icrc1_intent = created
            .intents
            .iter()
            .find(|intent| {
                intent.label == generate_intent_asset_label(link.link_type, ledger_icrc1)
            })
            .expect("ICRC1 intent should exist");
        let icrc2_intent = created
            .intents
            .iter()
            .find(|intent| {
                intent.label == generate_intent_asset_label(link.link_type, ledger_icrc2)
            })
            .expect("ICRC2 intent should exist");
        let fee_intent = created
            .intents
            .iter()
            .find(|intent| intent.label == INTENT_LABEL_LINK_CREATION_FEE)
            .expect("fee intent should exist");
        assert_eq!(icrc1_intent.asset.token_standard, TokenStandardV3::ICRC1);
        assert_eq!(icrc1_intent.asset.network_fee, Some(Nat::from(100u64)));
        assert_eq!(icrc2_intent.asset.token_standard, TokenStandardV3::ICRC2);
        assert_eq!(icrc2_intent.asset.network_fee, Some(Nat::from(200u64)));
        assert_eq!(fee_intent.asset.token_standard, TokenStandardV3::ICRC2);
        assert_eq!(fee_intent.asset.network_fee, None);

        match icrc1_intent
            .intent_tx_data
            .clone()
            .expect("ICRC1 intent tx data should exist")
        {
            IntentTransactionDataV3::Transfer(_) => {}
            _ => panic!("expected Transfer intent transaction data for ICRC1"),
        }
        match icrc2_intent
            .intent_tx_data
            .clone()
            .expect("ICRC2 intent tx data should exist")
        {
            IntentTransactionDataV3::TransferFrom(_) => {}
            _ => panic!("expected TransferFrom intent transaction data for ICRC2"),
        }
        match fee_intent
            .intent_tx_data
            .clone()
            .expect("fee intent tx data should exist")
        {
            IntentTransactionDataV3::TransferFrom(transfer_from_data) => {
                let fee_map: HashMap<Principal, Nat> = vec![
                    (ledger_icrc1, Nat::from(100u64)),
                    (ledger_icrc2, Nat::from(200u64)),
                    (ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64)),
                ]
                .into_iter()
                .collect();
                let (expected_fee_actual_amount, expected_fee_approval_amount) =
                    calculate_create_link_fee(&fee_map);
                assert_eq!(transfer_from_data.amount, expected_fee_actual_amount);
                assert_eq!(
                    transfer_from_data.approve_amount,
                    Some(expected_fee_approval_amount)
                );
                assert_eq!(
                    transfer_from_data.actual_amount,
                    Some(expected_fee_actual_amount)
                );
                assert_eq!(
                    transfer_from_data.asset.get_address(),
                    ICP_CANISTER_PRINCIPAL
                );
                assert_eq!(transfer_from_data.from, Wallet::new(creator));
                assert_eq!(
                    transfer_from_data.spender,
                    Wallet::from(Account {
                        owner: canister_id,
                        subaccount: None,
                    })
                );
            }
            _ => panic!("expected TransferFrom intent transaction data for fee intent"),
        }
    }
}
