// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::link_v3::dto::link::GetLinkResponseV3;
use cashier_backend_types::{
    dto::{action::Icrc112Requests, link::GetLinkOptions},
    error::CanisterError,
    link_v3::dto::{
        action::{CreateActionResponseV3, ProcessActionResponseV3},
        link::{
            CreateLinkInputV3, CreateLinkResponseV3, DisableLinkResponseV3, GetLinksResponseV3,
            SyncAssetBalanceCacheResponseV3,
        },
    },
    repository::{
        asset_info::v3::AssetInfoV3,
        intent::v3::IntentV3,
        link::{v1::LinkType, v3::LinkState},
        link_action::v1::LinkAction,
        user_link::v1::UserLink,
    },
    service::link::{PaginateInput, PaginateResult},
};
use cashier_common::utils::get_link_account;
use cashier_shared::{
    AddressType as SharedAddressType,
    types::{Action as SharedAction, ActionType as SharedActionType},
};
use transaction_manager::{
    transaction::traits::{ExecutionService, ValidationService},
    v3::traits::TransactionManagerV3,
};

use crate::{
    apps::{
        action::v3::ActionServiceV3, link_v3::factory::LinkFactoryV3,
        link_v3::utils::link_v3_asset_principals, token_balance::traits::TokenBalanceFetcher,
        token_fee::traits::TokenFeeCache, token_standard::traits::TokenStandardCache,
    },
    repositories::{self, Repositories},
};

pub struct LinkV3Service<R: Repositories> {
    pub link_v3_repository: repositories::link::v3::LinkV3Repository<R::LinkV3>,
    pub user_link_repository: repositories::user_link::UserLinkRepository<R::UserLink>,
    pub user_link_action_repository:
        repositories::user_link_action::UserLinkActionRepository<R::UserLinkAction>,
    pub action_service: ActionServiceV3<R>,
}

impl<R: Repositories> LinkV3Service<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            link_v3_repository: repo.link_v3(),
            user_link_repository: repo.user_link(),
            user_link_action_repository: repo.user_link_action(),
            action_service: ActionServiceV3::new(repo),
        }
    }

    /// Create a new link and the corresponding createAction
    ///
    /// # Arguments
    /// * `creator` - The principal of the user creating the link
    /// * `input` - The input data for creating the link
    /// * `created_at_ts` - The timestamp when the link is created
    /// # Returns
    /// * `GetLinkResp` - The response containing the created link and action details
    /// # Errors
    /// * `CanisterError` - If there is an error during link creation or action creation
    #[allow(clippy::too_many_arguments)]
    pub async fn create_link<M, F, S, B>(
        &mut self,
        input: CreateLinkInputV3,
        creator_id: Principal,
        canister_id: Principal,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<CreateLinkResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        if input.action.action_type != SharedActionType::CreateLink {
            return Err(CanisterError::InvalidInput(
                "Only CREATE action can be created when creating a link".to_string(),
            ));
        }

        let link_type: LinkType = input.link_type.into();
        let asset_info: Vec<AssetInfoV3> = input
            .action
            .intents
            .iter()
            .filter(|i| i.dest_address_type != SharedAddressType::Treasury)
            .map(|i| AssetInfoV3::from(IntentV3::from(i.clone())))
            .collect();

        let link_model = LinkFactoryV3::create_link(
            link_type,
            input.title,
            asset_info,
            input.max_use,
            creator_id,
            created_at,
            canister_id,
        )?;

        // save link & user_link to db
        self.link_v3_repository.create(link_model.clone());

        let new_user_link = UserLink {
            user_id: creator_id,
            link_id: link_model.id.clone(),
        };
        self.user_link_repository.create(new_user_link);

        // create action
        let action_result = self
            .create_action(
                link_model.id.as_str(),
                input.action.clone(),
                creator_id,
                canister_id,
                created_at,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await?;

        Ok(CreateLinkResponseV3 {
            link: action_result.link,
            action: action_result.action,
            icrc112_requests: action_result.icrc112_requests,
        })
    }

    /// Creates a new action V3.
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `canister_id` - The canister ID of the token contract
    /// * `link_id` - The ID of the link for which the action is created
    /// * `action_type` - The type of action to be created
    /// # Returns
    /// * `Ok(SharedAction)` - The created action data
    /// * `Err(CanisterError)` - If action creation fails or validation errors occur
    #[allow(clippy::too_many_arguments)]
    pub async fn create_action<M, F, S, B>(
        &mut self,
        link_id: &str,
        action: SharedAction,
        creator: Principal,
        canister_id: Principal,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
    ) -> Result<CreateActionResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
    {
        let link_model = self
            .link_v3_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let action_model = self.action_service.create_action_from_shared_data(
            action.clone(),
            Some(link_id.to_string()),
            creator,
        );

        let link_instance = LinkFactoryV3::create_from_link_model(link_model, canister_id)?;
        let result = link_instance
            .create_action(
                creator,
                action_model.action_type,
                created_at,
                transaction_manager,
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await?;

        // save data to DB
        let link_action = LinkAction {
            link_id: link_id.to_string(),
            action_type: result.create_action_result.action.action_type.clone(),
            action_id: result.create_action_result.action.id.clone(),
            user_id: result.create_action_result.action.creator,
            link_user_state: None,
        };

        self.action_service.store_action_data(
            link_action.clone(),
            result.create_action_result.action.clone(),
            result.create_action_result.intents.clone(),
            result.create_action_result.intent_txs_map.clone(),
            result.create_action_result.action.creator,
        )?;

        self.user_link_action_repository.create(link_action);

        // format response
        let link_shared = result.link.to_shared();
        let action_shared = result
            .create_action_result
            .action
            .to_shared(result.create_action_result.intents);

        Ok(CreateActionResponseV3 {
            link: link_shared,
            action: action_shared,
            icrc112_requests: result.create_action_result.icrc112_requests,
        })
    }

    /// Process action V3.
    /// # Arguments
    /// * `caller` - The principal of the user processing the action
    /// * `canister_id` - The canister ID of the token contract
    /// * `action_id` - The ID of the action to be processed
    /// # Returns
    /// * `Ok(ProcessActionResponseV3)` - The processed action data
    /// * `Err(CanisterError)` - If action processing fails or validation errors occur
    pub async fn process_action<M, V, X>(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        action_id: &str,
        transaction_manager: M,
        validation_service: V,
        execution_service: X,
    ) -> Result<ProcessActionResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        V: ValidationService + 'static,
        X: ExecutionService + 'static,
    {
        let action_data = self
            .action_service
            .get_action_data(action_id)
            .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

        let link_model = self
            .link_v3_repository
            .get(&action_data.action.link_id)
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        let link = LinkFactoryV3::create_from_link_model(link_model, canister_id)?;
        let result = link
            .process_action(
                caller,
                action_data.action,
                action_data.intents,
                action_data.intent_txs,
                transaction_manager,
                validation_service,
                execution_service,
            )
            .await?;

        // save data to DB
        self.link_v3_repository.update(result.link.clone());
        self.action_service.update_action_data(
            result.process_action_result.action.clone(),
            result.process_action_result.intents.clone(),
            &result.process_action_result.intent_txs_map,
        )?;
        self.action_service.update_link_user_state(&result);

        // format response
        let link_shared = result.link.to_shared();
        let action_shared = result
            .process_action_result
            .action
            .to_shared(result.process_action_result.intents);

        Ok(ProcessActionResponseV3 {
            link: link_shared,
            action: action_shared,
            icrc112_requests: result.process_action_result.icrc112_requests,
            is_success: result.process_action_result.is_success,
            errors: result.process_action_result.errors,
        })
    }

    /// Retrieves a list of links for the caller with pagination support.
    /// # Arguments
    /// * `caller` - The principal of the user retrieving the links
    /// * `input` - Optional pagination parameters
    /// # Returns
    /// * `Ok(GetLinksResponseV3)` - The paginated list of links for the caller
    /// * `Err(CanisterError)` - If there is an error during retrieval or validation errors occur
    pub async fn get_links(
        &self,
        caller: Principal,
        input: Option<PaginateInput>,
    ) -> Result<GetLinksResponseV3, CanisterError> {
        let user_links = self
            .user_link_repository
            .get_links_by_user_id(&caller, &input.unwrap_or_default());

        let link_ids = user_links
            .data
            .iter()
            .map(|link_user| link_user.link_id.clone())
            .collect();

        let links = self.link_v3_repository.get_batch(link_ids);

        let paginate_result = PaginateResult::new(links, user_links.metadata);

        // format response
        Ok(paginate_result.map(|link| link.to_shared()))
    }

    /// Retrieves a specific link by its ID with optional action data.
    /// # Arguments
    /// * `caller` - The principal of the user retrieving the link details
    /// * `link_id` - The unique identifier of the link to retrieve
    /// * `options` - Optional parameters including action type to include in response
    /// * `transaction_manager` - The transaction manager for fetching action data
    /// # Returns
    /// * `Ok(GetLinkResponseV3)` - The link details along with action data
    /// * `Err(CanisterError)` - If link not found, access denied, or other errors occur
    pub async fn get_link_details<M>(
        &self,
        caller: Principal,
        link_id: &str,
        options: Option<GetLinkOptions>,
        transaction_manager: M,
    ) -> Result<GetLinkResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
    {
        let link_model = self
            .link_v3_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        // pick first Action and link_user_state
        let (action, link_user_state) = self
            .action_service
            .get_first_action(&caller, link_id, options);

        // build response dto
        let link_shared = link_model.to_shared();
        let (action_shared, icrc112_requests): (Option<SharedAction>, Option<Icrc112Requests>) =
            if let Some(action) = action {
                let action_data = self
                    .action_service
                    .get_action_data(&action.id)
                    .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

                let create_action_result = transaction_manager.create_action(
                    action,
                    action_data.intents,
                    Some(action_data.intent_txs),
                )?;

                let action_shared = create_action_result
                    .action
                    .to_shared(create_action_result.intents);
                let icrc112_requests = create_action_result.icrc112_requests;

                (Some(action_shared), icrc112_requests)
            } else {
                (None, None)
            };

        Ok(GetLinkResponseV3 {
            link: link_shared,
            action: action_shared,
            icrc112_requests,
            link_user_state,
        })
    }

    /// Syncs the asset balance cache for a link by querying actual token balances from the ledger.
    /// # Arguments
    /// * `caller` - The principal of the user triggering the sync (must be the link creator)
    /// * `canister_id` - The canister ID used to derive the link subaccount
    /// * `link_id` - The unique identifier of the link
    /// * `token_balance_service` - Service used to fetch token balances
    /// # Returns
    /// * `Ok(SyncAssetBalanceCacheResponseV3)` - The updated link data
    /// * `Err(CanisterError)` - If link not found, access denied, or balance fetch fails
    pub async fn sync_asset_balance_cache<B>(
        &mut self,
        caller: Principal,
        canister_id: Principal,
        link_id: &str,
        token_balance_service: B,
    ) -> Result<SyncAssetBalanceCacheResponseV3, CanisterError>
    where
        B: TokenBalanceFetcher,
    {
        let mut link = self
            .link_v3_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        if link.creator != caller {
            return Err(CanisterError::Unauthorized(
                "Only the creator can sync asset balance cache".to_string(),
            ));
        }

        let link_account = get_link_account(&link.id, canister_id)?;
        let asset_principals = link_v3_asset_principals(&link);

        let balance_map = token_balance_service
            .get_batch_token_balances(&link_account.into(), &asset_principals)
            .await?;

        for asset_info in &mut link.asset_info {
            if let Some(balance) = balance_map.get(&asset_info.asset.address) {
                asset_info.available_amount = Some(balance.clone());
            }
        }

        self.link_v3_repository.update(link.clone());

        Ok(SyncAssetBalanceCacheResponseV3 {
            link: link.to_shared(),
        })
    }

    /// Disables a link by its ID.
    /// # Arguments
    /// * `caller` - The principal of the user disabling the link
    /// * `link_id` - The unique identifier of the link to disable
    /// # Returns
    /// * `Ok(DisableLinkResponseV3)` - Confirmation of link being disabled
    /// * `Err(CanisterError)` - If link not found, access denied, already disabled, or other errors occur
    pub fn disable_link(
        &mut self,
        caller: Principal,
        link_id: &str,
    ) -> Result<DisableLinkResponseV3, CanisterError> {
        let mut link = self
            .link_v3_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        if link.creator != caller {
            return Err(CanisterError::Unauthorized(
                "Only the creator can disable the link".to_string(),
            ));
        }

        if link.state != LinkState::Active {
            return Err(CanisterError::ValidationErrors(
                "Only active links can be disabled".to_string(),
            ));
        }

        link.state = LinkState::Inactive;
        // update link in db
        self.link_v3_repository.update(link.clone());

        // format response
        let link_shared = link.to_shared();

        Ok(DisableLinkResponseV3 { link: link_shared })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::apps::{
        shared::test_utils::tests::{
            MockExecutionService, MockTransactionManagerV3, MockValidationService,
        },
        token_balance::service::tests::MockTokenBalanceService,
        token_fee::service::tests::{
            MockTokenFeeService, create_mock_service as create_mock_token_fee_service,
        },
        token_standard::service::tests::{
            MockTokenStandardService, create_mock_service as create_mock_token_standard_service,
        },
    };
    use crate::repositories::tests::TestRepositories;
    use candid::Nat;
    use cashier_backend_types::repository::{
        action::v1::ActionType,
        asset::v3::{AssetV3, TokenStandardV3},
        asset_info::v3::AssetInfoV3,
        link::v1::LinkType,
        link::v3::{LinkState, LinkV3},
    };
    use cashier_common::{
        constant::ICP_CANISTER_PRINCIPAL,
        test_utils::{random_id_string, random_principal_id},
    };
    use cashier_shared::types::{
        Action as SharedAction, ActionState as SharedActionState, ActionType as SharedActionType,
        AddressType as SharedAddressType, Asset as SharedAsset, Intent as SharedIntent,
        IntentState as SharedIntentState, IntentType as SharedIntentType,
        LinkType as SharedLinkType, TokenStandard as SharedTokenStandard,
    };
    use token_storage_types::token::IcrcStandard;
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
            available_amount: None,
        }
    }

    fn fixture_of_link_v3(id: &str, creator: Principal, state: LinkState) -> LinkV3 {
        LinkV3 {
            id: id.to_string(),
            title: "test-link".to_string(),
            link_type: LinkType::SendTokenBasket,
            asset_info: vec![fixture_of_asset_info_v3(
                random_principal_id(),
                Nat::from(1_000u64),
            )],
            max_use: 3,
            use_count: 0,
            creator,
            state,
            created_at: 1_000_000,
        }
    }

    fn fixture_of_shared_intent(
        creator: Principal,
        canister_id: Principal,
        ledger_id: Principal,
    ) -> SharedIntent {
        SharedIntent {
            id: Uuid::new_v4().to_string(),
            intent_type: SharedIntentType::Send,
            asset: SharedAsset {
                address: ledger_id,
                network_fee: None,
                token_standard: Some(SharedTokenStandard::ICRC1),
            },
            amount: Nat::from(1_000u64),
            total_amount: Some(Nat::from(1_000u64)),
            network_fee: None,
            user_fee: None,
            source_address: creator,
            source_address_type: SharedAddressType::Creator,
            dest_address: canister_id,
            dest_address_type: SharedAddressType::Link,
            dependencies: Some(vec![]),
            action_id: None,
            intent_state: SharedIntentState::Created,
        }
    }

    fn fixture_of_shared_action(
        action_type: SharedActionType,
        creator: Principal,
        canister_id: Principal,
        ledger_id: Principal,
    ) -> SharedAction {
        SharedAction {
            id: Uuid::new_v4().to_string(),
            creator,
            creator_address_type: SharedAddressType::Creator,
            action_type,
            intents: vec![fixture_of_shared_intent(creator, canister_id, ledger_id)],
            action_state: SharedActionState::Created,
            link_id: None,
            intent_ids: None,
        }
    }

    fn fixture_of_create_link_input_v3(
        action_type: SharedActionType,
        creator: Principal,
        canister_id: Principal,
        ledger_id: Principal,
    ) -> CreateLinkInputV3 {
        CreateLinkInputV3 {
            title: "test-link".to_string(),
            link_type: SharedLinkType::SendTip,
            max_use: 3,
            action: fixture_of_shared_action(action_type, creator, canister_id, ledger_id),
        }
    }

    fn fixture_of_services(
        current_ts: u64,
    ) -> (
        MockTokenFeeService,
        MockTokenStandardService,
        MockTokenBalanceService,
    ) {
        (
            create_mock_token_fee_service(current_ts),
            create_mock_token_standard_service(current_ts),
            MockTokenBalanceService::new(),
        )
    }

    #[tokio::test]
    async fn it_should_fail_create_link_due_to_non_create_action_type() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let (token_fee_service, token_standard_service, token_balance_service) =
            fixture_of_services(1_000_000);

        let result = service
            .create_link(
                fixture_of_create_link_input_v3(
                    SharedActionType::Receive,
                    creator,
                    canister_id,
                    ledger_id,
                ),
                creator,
                canister_id,
                1_000_000,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await;

        assert!(matches!(result, Err(CanisterError::InvalidInput(_))));
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_missing_link() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let mut token_standard_service = create_mock_token_standard_service(1_000_000);
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        let result = service
            .create_action(
                "missing-link",
                fixture_of_shared_action(
                    SharedActionType::CreateLink,
                    creator,
                    canister_id,
                    ledger_id,
                ),
                creator,
                canister_id,
                1_000_000,
                MockTransactionManagerV3::default(),
                create_mock_token_fee_service(1_000_000),
                token_standard_service,
                MockTokenBalanceService::new(),
            )
            .await;

        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_missing_action() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);

        let result = service
            .process_action(
                random_principal_id(),
                random_principal_id(),
                "missing-action",
                MockTransactionManagerV3::default(),
                MockValidationService,
                MockExecutionService,
            )
            .await;

        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[tokio::test]
    async fn it_should_fail_get_link_details_due_to_missing_link() {
        let repositories = TestRepositories::new();
        let service = LinkV3Service::new(&repositories);

        let result = service
            .get_link_details(
                random_principal_id(),
                "missing-link",
                None,
                MockTransactionManagerV3::default(),
            )
            .await;

        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[test]
    fn it_should_fail_disable_link_due_to_missing_link() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);

        let result = service.disable_link(random_principal_id(), "missing-link");

        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[test]
    fn it_should_fail_disable_link_due_to_unauthorized_caller() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let link = fixture_of_link_v3("link-1", creator, LinkState::Active);
        service.link_v3_repository.create(link);

        let result = service.disable_link(random_principal_id(), "link-1");

        assert!(matches!(result, Err(CanisterError::Unauthorized(_))));
    }

    #[test]
    fn it_should_fail_disable_link_due_to_non_active_link() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let link = fixture_of_link_v3("link-1", creator, LinkState::Created);
        service.link_v3_repository.create(link);

        let result = service.disable_link(creator, "link-1");

        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_for_icrc1_link() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000;
        let link_id = Uuid::new_v4().to_string();

        let link = LinkV3 {
            id: link_id.clone(),
            title: "link-icrc1".to_string(),
            link_type: LinkType::SendTip,
            asset_info: vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1_000u64))],
            max_use: 3,
            use_count: 0,
            creator,
            state: LinkState::Created,
            created_at,
        };
        service.link_v3_repository.create(link);

        let token_fee_service = create_mock_token_fee_service(created_at);
        let mut token_standard_service = create_mock_token_standard_service(created_at);
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        let result = service
            .create_action(
                &link_id,
                fixture_of_shared_action(
                    SharedActionType::CreateLink,
                    creator,
                    canister_id,
                    ledger_id,
                ),
                creator,
                canister_id,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                MockTokenBalanceService::new(),
            )
            .await;

        assert!(result.is_ok());
        let response = result.expect("create_action should succeed for icrc1");
        assert_eq!(response.action.action_type, SharedActionType::CreateLink);
        assert!(
            response
                .action
                .intents
                .iter()
                .any(|i| i.dest_address_type == SharedAddressType::Treasury)
        );
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_for_icrc2_link() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000;
        let link_id = Uuid::new_v4().to_string();

        let link = LinkV3 {
            id: link_id.clone(),
            title: "link-icrc2".to_string(),
            link_type: LinkType::SendTip,
            asset_info: vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1_000u64))],
            max_use: 3,
            use_count: 0,
            creator,
            state: LinkState::Created,
            created_at,
        };
        service.link_v3_repository.create(link);

        let token_fee_service = create_mock_token_fee_service(created_at);
        let mut token_standard_service = create_mock_token_standard_service(created_at);
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC2]);

        let result = service
            .create_action(
                &link_id,
                fixture_of_shared_action(
                    SharedActionType::CreateLink,
                    creator,
                    canister_id,
                    ledger_id,
                ),
                creator,
                canister_id,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                MockTokenBalanceService::new(),
            )
            .await;

        assert!(result.is_ok());
        let response = result.expect("create_action should succeed for icrc2");
        assert_eq!(response.action.action_type, SharedActionType::CreateLink);
        assert!(
            response
                .action
                .intents
                .iter()
                .any(|i| i.dest_address_type == SharedAddressType::Treasury)
        );
    }

    #[tokio::test]
    async fn it_should_succeed_create_link() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000;
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);

        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_fee_service
            .fetcher
            .set_fee(ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        let response = service
            .create_link(
                fixture_of_create_link_input_v3(
                    SharedActionType::CreateLink,
                    creator,
                    canister_id,
                    ledger_id,
                ),
                creator,
                canister_id,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await
            .expect("create link should succeed");

        assert_eq!(response.link.creator, creator);
        assert_eq!(response.action.action_type, SharedActionType::CreateLink);
        assert_eq!(response.link.link_type, SharedLinkType::SendTip);
    }

    #[tokio::test]
    async fn it_should_succeed_process_action() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000;
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);

        token_fee_service
            .fetcher
            .set_fee(ledger_id, Nat::from(100u64));
        token_fee_service
            .fetcher
            .set_fee(ICP_CANISTER_PRINCIPAL, Nat::from(10_000u64));
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        let created = service
            .create_link(
                fixture_of_create_link_input_v3(
                    SharedActionType::CreateLink,
                    creator,
                    canister_id,
                    ledger_id,
                ),
                creator,
                canister_id,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await
            .expect("create link should succeed");

        let processed = service
            .process_action(
                creator,
                canister_id,
                &created.action.id,
                MockTransactionManagerV3::default(),
                MockValidationService,
                MockExecutionService,
            )
            .await
            .expect("process action should succeed");

        assert!(processed.is_success);
        assert_eq!(
            processed.link.link_state,
            cashier_shared::types::LinkState::Active
        );
    }

    #[tokio::test]
    async fn it_should_succeed_get_links() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000;
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);

        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        let created = service
            .create_link(
                fixture_of_create_link_input_v3(
                    SharedActionType::CreateLink,
                    creator,
                    canister_id,
                    ledger_id,
                ),
                creator,
                canister_id,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await
            .expect("create link should succeed");

        let response = service
            .get_links(creator, None)
            .await
            .expect("get links should succeed");

        assert_eq!(response.data.len(), 1);
        assert_eq!(response.data[0].id, created.link.id);
    }

    #[tokio::test]
    async fn it_should_succeed_get_link_details_with_action() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000;
        let (token_fee_service, mut token_standard_service, token_balance_service) =
            fixture_of_services(created_at);

        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        let created = service
            .create_link(
                fixture_of_create_link_input_v3(
                    SharedActionType::CreateLink,
                    creator,
                    canister_id,
                    ledger_id,
                ),
                creator,
                canister_id,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
            )
            .await
            .expect("create link should succeed");

        let response = service
            .get_link_details(
                creator,
                &created.link.id,
                Some(GetLinkOptions {
                    action_type: ActionType::CreateLink,
                }),
                MockTransactionManagerV3::default(),
            )
            .await
            .expect("get link details should succeed");

        assert_eq!(response.link.id, created.link.id);
        assert!(response.action.is_some());
        assert_eq!(
            response.action.expect("action should exist").action_type,
            SharedActionType::CreateLink
        );
    }

    #[test]
    fn it_should_succeed_disable_link() {
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let link = fixture_of_link_v3("link-1", creator, LinkState::Active);
        service.link_v3_repository.create(link);

        let response = service
            .disable_link(creator, "link-1")
            .expect("disable link should succeed");

        assert_eq!(
            response.link.link_state,
            cashier_shared::types::LinkState::Inactive
        );
    }

    #[tokio::test]
    async fn it_should_fail_sync_asset_balance_cache_due_to_link_not_found() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let caller = random_principal_id();
        let canister_id = random_principal_id();
        let token_balance_service = MockTokenBalanceService::new();

        // Act
        let result = service
            .sync_asset_balance_cache(
                caller,
                canister_id,
                "non-existent-link",
                token_balance_service,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[tokio::test]
    async fn it_should_fail_sync_asset_balance_cache_due_to_unauthorized() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let non_creator = random_principal_id();
        let canister_id = random_principal_id();
        let link = fixture_of_link_v3("link-1", creator, LinkState::Active);
        service.link_v3_repository.create(link);
        let token_balance_service = MockTokenBalanceService::new();

        // Act
        let result = service
            .sync_asset_balance_cache(non_creator, canister_id, "link-1", token_balance_service)
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::Unauthorized(_))));
    }

    #[tokio::test]
    async fn it_should_fail_sync_asset_balance_cache_due_to_token_balance_fetch_failure() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = ICP_CANISTER_PRINCIPAL;
        let token_principal = random_principal_id();
        let link_id = random_id_string();
        let link = LinkV3 {
            asset_info: vec![fixture_of_asset_info_v3(
                token_principal,
                Nat::from(1_000u64),
            )],
            ..fixture_of_link_v3(&link_id, creator, LinkState::Active)
        };
        service.link_v3_repository.create(link);
        // MockTokenBalanceService with no balances set — will return error for any token
        let token_balance_service = MockTokenBalanceService::new();

        // Act
        let result = service
            .sync_asset_balance_cache(creator, canister_id, &link_id, token_balance_service)
            .await;

        // Assert
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn it_should_sync_asset_balance_cache() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = ICP_CANISTER_PRINCIPAL;
        let token_principal = random_principal_id();
        let link_id = random_id_string();
        let link = LinkV3 {
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(500u64)),
                ..fixture_of_asset_info_v3(token_principal, Nat::from(1_000u64))
            }],
            ..fixture_of_link_v3(&link_id, creator, LinkState::Active)
        };
        service.link_v3_repository.create(link);
        let actual_balance = Nat::from(850u64);
        let mut token_balance_service = MockTokenBalanceService::new();
        token_balance_service.set_balance(token_principal, actual_balance.clone());

        // Act
        let result = service
            .sync_asset_balance_cache(creator, canister_id, &link_id, token_balance_service)
            .await;

        // Assert
        assert!(result.is_ok());
        let response = result.unwrap();
        let updated_asset = response.link.asset_info.first().unwrap();
        assert_eq!(updated_asset.available_amount, Some(actual_balance));
    }
}
