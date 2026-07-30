// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::link_v3::dto::link::GetLinkResponseV3;
use cashier_backend_types::{
    dto::{action::Icrc112Requests, link::GetLinkOptions},
    error::CanisterError,
    link_v3::{
        dto::{
            action::{CreateActionResponseV3, ProcessActionResponseV3},
            link::{
                CreateLinkInputV3, CreateLinkResponseV3, DisableLinkResponseV3, GetLinksResponseV3,
                SyncAssetBalanceCacheResponseV3,
            },
        },
        link_result::LinkProcessActionResult,
    },
    repository::{
        action::v1::{ActionState, ActionType},
        asset_info::v3::AssetInfoV3,
        intent::v3::IntentV3,
        link::{
            v1::LinkType,
            v3::{LinkState, LinkV3},
        },
        link_action::v1::LinkAction,
        user_link::v1::UserLink,
    },
    service::link::{PaginateInput, PaginateResult, PaginateResultMetadata},
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
        action::v3::ActionServiceV3,
        link_v3::{factory::LinkFactoryV3, traits::GateValidator, utils::link_v3_asset_principals},
        token_balance::traits::TokenBalanceFetcher,
        token_fee::traits::TokenFeeCache,
        token_standard::traits::TokenStandardCache,
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
    pub async fn create_link<M, F, S, B, V>(
        &mut self,
        input: CreateLinkInputV3,
        creator_id: Principal,
        canister_id: Principal,
        created_at: u64,
        transaction_manager: M,
        token_fee_service: F,
        token_standard_service: S,
        token_balance_service: B,
        gate_validator: V,
    ) -> Result<CreateLinkResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
        V: GateValidator,
    {
        if input.action.action_type != SharedActionType::CreateLink {
            return Err(CanisterError::InvalidInput(
                "Only CREATE action can be created when creating a link".to_string(),
            ));
        }

        let gate_count = input.gate_keys.as_ref().map_or(0, |v| v.len() as u64);

        let link_type: LinkType = input.link_type.into();
        let asset_info: Vec<AssetInfoV3> = input
            .action
            .intents
            .iter()
            .filter(|i| {
                i.dest_address_type != SharedAddressType::Treasury
                    && i.dest_address_type != SharedAddressType::Gate
            })
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
                gate_validator,
                gate_count,
            )
            .await?;

        Ok(CreateLinkResponseV3 {
            link: action_result.link,
            action: action_result.action,
            icrc112_requests: action_result.icrc112_requests,
            gates: vec![],
        })
    }

    /// Creates a new action V3.
    /// # Arguments
    /// * `caller` - The principal of the user creating the action
    /// * `canister_id` - The canister ID of the token contract
    /// * `link_id` - The ID of the link for which the action is created
    /// * `action_type` - The type of action to be created
    /// * `gate_validator` - Validator that checks whether all gates are open for the caller
    /// # Returns
    /// * `Ok(SharedAction)` - The created action data
    /// * `Err(CanisterError)` - If action creation fails or validation errors occur
    #[allow(clippy::too_many_arguments)]
    pub async fn create_action<M, F, S, B, V>(
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
        gate_validator: V,
        gate_count: u64,
    ) -> Result<CreateActionResponseV3, CanisterError>
    where
        M: TransactionManagerV3 + 'static,
        F: TokenFeeCache + 'static,
        S: TokenStandardCache + 'static,
        B: TokenBalanceFetcher + 'static,
        V: GateValidator,
    {
        let link_model = self
            .link_v3_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        gate_validator.check_all_gates_open(link_id, creator, link_model.creator)?;

        let action_model = self.action_service.create_action_from_shared_data(
            action.clone(),
            Some(link_id.to_string()),
            creator,
        );

        // Reject a new claim while the caller already has a pending (not yet
        // successful) action for this link+type. Repeat claims are only
        // allowed once the previous one has resolved, so this closes the
        // race that used to be prevented by accident (e.g. two tabs).
        if let Some(existing_actions) = self
            .user_link_action_repository
            .get_actions_by_user_link_and_type(creator, link_id, &action_model.action_type)
        {
            let has_pending = existing_actions.iter().any(|link_action| {
                self.action_service
                    .get_action_data(&link_action.action_id)
                    .map(|data| data.action.state != ActionState::Success)
                    .unwrap_or(false)
            });

            if has_pending {
                return Err(CanisterError::ValidationErrors(
                    "A pending action already exists for this link".to_string(),
                ));
            }
        }

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
                gate_count,
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

        // store_action_data already records the LinkAction in
        // user_link_action_repository — do not insert it a second time here,
        // or every claim would be double-counted in get_link_details's actions.
        self.action_service.store_action_data(
            link_action,
            result.create_action_result.action.clone(),
            result.create_action_result.intents.clone(),
            result.create_action_result.intent_txs_map.clone(),
            result.create_action_result.action.creator,
        )?;

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
    /// * `Err(CanisterError::NotFound)` - If the action or link is not found
    /// * `Err(CanisterError::ValidationErrors)` - If the action has already been successfully processed or validation errors occur
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

        if action_data.action.state == ActionState::Success {
            return Err(CanisterError::ValidationErrors(
                "Action has already been successfully processed".to_string(),
            ));
        }

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

        // Persist action data FIRST: it reflects what actually happened on the
        // ledger regardless of whether the link commit below succeeds.
        self.action_service.update_action_data(
            result.process_action_result.action.clone(),
            result.process_action_result.intents.clone(),
            &result.process_action_result.intent_txs_map,
        )?;

        // Commit the link on a fresh repository read (result.link is a pre-await
        // snapshot). A failed result never updates the link; a retry of an
        // already-Success action is idempotent (no second commit).
        let updated_link = if result.process_action_result.is_success {
            self.update_link_with_process_action_result(&result)?
        } else {
            result.link.clone()
        };
        self.action_service.update_link_user_state(&result);

        // format response
        let link_shared = updated_link.to_shared();
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

    /// Commit a successful process_action outcome to the stored link.
    ///
    /// The link inside `result` is a pre-action snapshot and may be stale
    /// (other claims can commit while this action awaited the ledger), so the
    /// update is computed on a fresh repository read plus the successful
    /// action's intents only.
    /// # Arguments
    /// * `result` - The process_action outcome to commit; must be successful
    /// # Returns
    /// * `Ok(LinkV3)` - The updated link after applying the action's intents
    /// * `Err(CanisterError)` - If the result is a failed action or the link is not found
    fn update_link_with_process_action_result(
        &mut self,
        result: &LinkProcessActionResult,
    ) -> Result<LinkV3, CanisterError> {
        let action_result = &result.process_action_result;
        if !action_result.is_success {
            return Err(CanisterError::ValidationErrors(
                "Cannot update link from a failed process_action result".to_string(),
            ));
        }

        let mut link = self
            .link_v3_repository
            .get(&result.link.id)
            .ok_or_else(|| CanisterError::NotFound(format!("Link {} not found", result.link.id)))?;

        match action_result.action.action_type {
            ActionType::CreateLink => link.apply_create_action_success(&action_result.intents)?,
            // Send and Receive are both user claims (link -> user transfer),
            // so both consume a use and deduct from the link's available pool.
            ActionType::Receive | ActionType::Send => {
                link.apply_receive_action_success(&action_result.intents)?
            }
            ActionType::Withdraw => link.apply_withdraw_action_success(&action_result.intents)?,
        }

        self.link_v3_repository.update(link.clone());
        Ok(link)
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
        let requested = input.unwrap_or_default();

        // Pull every link id for the caller up front: `get_links_by_user_id`'s
        // own pagination is over its stable-storage key order, which sorts by
        // the random link id rather than creation time, so applying the
        // caller's offset/limit there can permanently hide newly-created
        // links behind older ones once a user has more links than one page.
        // Sort by `created_at` first, then paginate over that.
        let all_user_links = self.user_link_repository.get_links_by_user_id(
            &caller,
            &PaginateInput {
                offset: 0,
                limit: usize::MAX,
            },
        );

        let link_ids = all_user_links
            .data
            .iter()
            .map(|link_user| link_user.link_id.clone())
            .collect();

        let mut links = self.link_v3_repository.get_batch(link_ids);
        links.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        let total = links.len();
        let offset = requested.offset;
        let limit = requested.limit;
        let paginated_links: Vec<LinkV3> = links.into_iter().skip(offset).take(limit).collect();

        let metadata = PaginateResultMetadata {
            total,
            offset,
            limit,
            is_next: offset + limit < total,
            is_prev: offset > 0,
        };

        let paginate_result = PaginateResult::new(paginated_links, metadata);

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

        // fetch all of the caller's actions for this link+type, so repeat
        // claims can be resumed or started fresh rather than always
        // resolving to the very first action ever created.
        let actions = self.action_service.get_actions(&caller, link_id, options);

        // the first not-yet-successful action (by creation order) is the one
        // to resume; icrc112_requests are only ever built for it.
        let pending_index = actions.iter().position(|a| a.state != ActionState::Success);

        let link_shared = link_model.to_shared();
        let mut icrc112_requests: Option<Icrc112Requests> = None;
        let mut actions_shared: Vec<SharedAction> = Vec::with_capacity(actions.len());

        for (idx, action) in actions.into_iter().enumerate() {
            let action_data = self
                .action_service
                .get_action_data(&action.id)
                .map_err(|_e| CanisterError::NotFound("Action not found".to_string()))?;

            if Some(idx) == pending_index {
                let create_action_result = transaction_manager.create_action(
                    action,
                    action_data.intents,
                    Some(action_data.intent_txs),
                )?;

                icrc112_requests = create_action_result.icrc112_requests;
                actions_shared.push(
                    create_action_result
                        .action
                        .to_shared(create_action_result.intents),
                );
            } else {
                actions_shared.push(action.to_shared(action_data.intents));
            }
        }

        Ok(GetLinkResponseV3 {
            link: link_shared,
            actions: actions_shared,
            icrc112_requests,
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

        if link.state != LinkState::Active && link.state != LinkState::Inactive {
            return Err(CanisterError::ValidationErrors(
                "Only active or inactive links can have their balance cache synced".to_string(),
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

    /// Get a link by its ID.
    /// # Arguments
    /// * `link_id` - The unique identifier of the link to retrieve
    /// # Returns
    /// * `Ok(LinkV3)` - The link data
    /// * `Err(CanisterError)` - If link not found
    pub fn get_link(&self, link_id: &str) -> Result<LinkV3, CanisterError> {
        let link = self
            .link_v3_repository
            .get(&link_id.to_string())
            .ok_or_else(|| CanisterError::NotFound("Link not found".to_string()))?;

        Ok(link)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::apps::{
        gate_service::service::{GateAppService, tests::MockGateServiceClient},
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
        action::{v1::ActionType, v3::ActionV3},
        asset::v3::{AssetV3, TokenStandardV3},
        asset_info::v3::AssetInfoV3,
        common::{AddressTypeV3, Wallet},
        intent::{
            v1::{IntentState, TransferData},
            v3::{IntentTransactionDataV3, IntentTypeV3},
        },
        link::{
            v1::LinkType,
            v3::{LinkState, LinkV3},
        },
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
    use gate_service_types::{Gate, GateKey};
    use token_storage_types::token::IcrcStandard;
    use uuid::Uuid;

    fn make_gate_validator(
        repo: &TestRepositories,
    ) -> GateAppService<TestRepositories, MockGateServiceClient> {
        GateAppService::new(repo, MockGateServiceClient::new())
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
            label: String::new(),
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
            gate_keys: None,
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
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let (token_fee_service, token_standard_service, token_balance_service) =
            fixture_of_services(1_000_000);

        // Act
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
                make_gate_validator(&repositories),
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::InvalidInput(_))));
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_missing_link() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let mut token_standard_service = create_mock_token_standard_service(1_000_000);
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act
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
                make_gate_validator(&repositories),
                0,
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[tokio::test]
    async fn it_should_fail_create_action_due_to_gate_closed_for_non_creator() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let caller = random_principal_id(); // different from creator
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000;
        let link_id = Uuid::new_v4().to_string();
        let gate_id = format!("gate_{}", random_id_string());

        let link = LinkV3 {
            id: link_id.clone(),
            title: "gated-link".to_string(),
            link_type: LinkType::SendTip,
            asset_info: vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1_000u64))],
            max_use: 3,
            use_count: 0,
            creator,
            state: LinkState::Active,
            created_at,
        };
        service.link_v3_repository.create(link);

        // register a gate for the link — caller has NOT opened it
        repositories.link_gate().add_gate(
            &link_id,
            Gate {
                id: gate_id,
                creator,
                subject_id: link_id.clone(),
                key: GateKey::PasswordRedacted,
            },
        );

        let mut token_standard_service = create_mock_token_standard_service(created_at);
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act
        let result = service
            .create_action(
                &link_id,
                fixture_of_shared_action(SharedActionType::Receive, caller, canister_id, ledger_id),
                caller,
                canister_id,
                created_at,
                MockTransactionManagerV3::default(),
                create_mock_token_fee_service(created_at),
                token_standard_service,
                MockTokenBalanceService::new(),
                make_gate_validator(&repositories),
                0,
            )
            .await;

        // Assert — caller has not opened the gate, so action must be denied
        assert!(matches!(result, Err(CanisterError::Unauthorized(_))));
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_for_creator_even_when_gate_is_closed() {
        // Arrange — same setup as above but caller IS the creator
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000;
        let link_id = Uuid::new_v4().to_string();
        let gate_id = format!("gate_{}", random_id_string());

        let link = LinkV3 {
            id: link_id.clone(),
            title: "gated-link".to_string(),
            link_type: LinkType::SendTip,
            asset_info: vec![fixture_of_asset_info_v3(ledger_id, Nat::from(1_000u64))],
            max_use: 3,
            use_count: 0,
            creator,
            state: LinkState::Created,
            created_at,
        };
        service.link_v3_repository.create(link);

        // gate exists and creator has NOT opened it
        repositories.link_gate().add_gate(
            &link_id,
            Gate {
                id: gate_id,
                creator,
                subject_id: link_id.clone(),
                key: GateKey::PasswordRedacted,
            },
        );

        let token_fee_service = create_mock_token_fee_service(created_at);
        let mut token_standard_service = create_mock_token_standard_service(created_at);
        token_standard_service
            .token_storage_client
            .set_token_standards(ledger_id, vec![IcrcStandard::ICRC1]);

        // Act — creator calls create_action on their own link
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
                make_gate_validator(&repositories),
                0,
            )
            .await;

        // Assert — creator bypasses the gate check
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn it_should_fail_process_action_due_to_missing_action() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);

        // Act
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

        // Assert
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[tokio::test]
    async fn it_should_fail_get_link_details_due_to_missing_link() {
        // Arrange
        let repositories = TestRepositories::new();
        let service = LinkV3Service::new(&repositories);

        // Act
        let result = service
            .get_link_details(
                random_principal_id(),
                "missing-link",
                None,
                MockTransactionManagerV3::default(),
            )
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[test]
    fn it_should_fail_disable_link_due_to_missing_link() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);

        // Act
        let result = service.disable_link(random_principal_id(), "missing-link");

        // Assert
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[test]
    fn it_should_fail_disable_link_due_to_unauthorized_caller() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let link = fixture_of_link_v3("link-1", creator, LinkState::Active);
        service.link_v3_repository.create(link);

        // Act
        let result = service.disable_link(random_principal_id(), "link-1");

        // Assert
        assert!(matches!(result, Err(CanisterError::Unauthorized(_))));
    }

    #[test]
    fn it_should_fail_disable_link_due_to_non_active_link() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let link = fixture_of_link_v3("link-1", creator, LinkState::Created);
        service.link_v3_repository.create(link);

        // Act
        let result = service.disable_link(creator, "link-1");

        // Assert
        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }

    #[tokio::test]
    async fn it_should_succeed_create_action_for_icrc1_link() {
        // Arrange
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

        // Act
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
                make_gate_validator(&repositories),
                0,
            )
            .await;

        // Assert
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
        // Arrange
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

        // Act
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
                make_gate_validator(&repositories),
                0,
            )
            .await;

        // Assert
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
        // Arrange
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

        // Act
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
                make_gate_validator(&repositories),
            )
            .await
            .expect("create link should succeed");

        // Assert
        assert_eq!(response.link.creator, creator);
        assert_eq!(response.action.action_type, SharedActionType::CreateLink);
        assert_eq!(response.link.link_type, SharedLinkType::SendTip);
    }

    #[tokio::test]
    async fn it_should_succeed_process_action() {
        // Arrange
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
                make_gate_validator(&repositories),
            )
            .await
            .expect("create link should succeed");

        // Act
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

        // Assert
        assert!(processed.is_success);
        assert_eq!(
            processed.link.link_state,
            cashier_shared::types::LinkState::Active
        );
    }

    #[tokio::test]
    async fn it_should_reject_processing_an_already_success_action() {
        // Arrange — an Active link that has ALREADY consumed one use, and a RECEIVE
        // action stored in `Success` state (i.e. processed once before). Re-processing
        // it (lost-response retry / re-call) must be rejected with a validation error
        // and must NOT commit the link a second time (no phantom use_count/amount drain).
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let receiver = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let link_id = random_id_string();
        let action_id = random_id_string();

        // Link already has one claim committed: use_count = 1, balance deducted once.
        let link = LinkV3 {
            asset_info: vec![AssetInfoV3 {
                available_amount: Some(Nat::from(5_800u64)),
                ..fixture_of_asset_info_v3(ledger_id, Nat::from(10_000u64))
            }],
            use_count: 1,
            ..fixture_of_link_v3(&link_id, creator, LinkState::Active)
        };
        service.link_v3_repository.create(link);

        // The receive action is already in Success state (processed before).
        let receive_intent = IntentV3 {
            id: random_id_string(),
            label: "intent".to_string(),
            intent_type: IntentTypeV3::Send,
            asset: AssetV3 {
                address: ledger_id,
                network_fee: Some(Nat::from(200u64)),
                token_standard: TokenStandardV3::ICRC1,
            },
            amount: Nat::from(4_000u64),
            total_amount: None,
            network_fee: None,
            user_fee: None,
            source_address: canister_id,
            source_account: None,
            source_address_type: AddressTypeV3::Link,
            dest_address: receiver,
            dest_account: None,
            dest_address_type: AddressTypeV3::User,
            intent_tx_data: Some(IntentTransactionDataV3::Transfer(TransferData {
                from: Wallet::default(),
                to: Wallet::default(),
                asset: cashier_backend_types::repository::asset::v1::Asset::default(),
                amount: Nat::from(4_000u64),
            })),
            dependencies: vec![],
            action_id: action_id.clone(),
            state: IntentState::Success,
            created_at: 1_000_000,
        };
        let action = ActionV3 {
            id: action_id.clone(),
            action_type: ActionType::Receive,
            link_id: link_id.clone(),
            creator: receiver,
            creator_address_type: AddressTypeV3::User,
            state: ActionState::Success,
            intent_ids: vec![receive_intent.id.clone()],
        };
        let link_action = LinkAction {
            link_id: link_id.clone(),
            action_type: ActionType::Receive,
            action_id: action_id.clone(),
            user_id: receiver,
            link_user_state: None,
        };
        service
            .action_service
            .store_action_data(
                link_action,
                action,
                vec![receive_intent],
                std::collections::HashMap::new(),
                receiver,
            )
            .expect("store action data should succeed");

        // Act — re-process the already-Success action.
        let result = service
            .process_action(
                receiver,
                canister_id,
                &action_id,
                MockTransactionManagerV3::default(),
                MockValidationService,
                MockExecutionService,
            )
            .await;

        // Assert — re-processing is rejected with a validation error...
        assert!(
            matches!(result, Err(CanisterError::ValidationErrors(_))),
            "re-processing an already-Success action must be rejected, got {result:?}"
        );

        // ...and the link was NOT committed again (no second use, no second deduction).
        let stored = service
            .link_v3_repository
            .get(&link_id)
            .expect("link should exist");
        assert_eq!(
            stored.use_count, 1,
            "rejected retry must not consume a second use"
        );
        assert_eq!(
            stored.asset_info[0].available_amount,
            Some(Nat::from(5_800u64)),
            "rejected retry must not deduct available_amount a second time"
        );
        assert_eq!(stored.state, LinkState::Active);
    }

    #[tokio::test]
    async fn it_should_succeed_get_links() {
        // Arrange
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
                make_gate_validator(&repositories),
            )
            .await
            .expect("create link should succeed");

        // Act
        let response = service
            .get_links(creator, None)
            .await
            .expect("get links should succeed");

        // Assert
        assert_eq!(response.data.len(), 1);
        assert_eq!(response.data[0].id, created.link.id);
    }

    #[tokio::test]
    async fn it_should_succeed_get_links_ordered_by_created_at_desc_across_pagination() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();

        // Create links out of chronological order and with random ids, to
        // prove ordering doesn't rely on insertion order or on the
        // (randomly generated) link id sorting lexicographically.
        let timestamps = [3_000_000u64, 1_000_000u64, 2_000_000u64];
        let mut created_ids = Vec::new();
        for created_at in timestamps {
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
                    make_gate_validator(&repositories),
                )
                .await
                .expect("create link should succeed");
            created_ids.push(created.link.id);
        }

        // Act: walk both pages
        let page1 = service
            .get_links(
                creator,
                Some(PaginateInput {
                    offset: 0,
                    limit: 2,
                }),
            )
            .await
            .expect("get links should succeed");
        let page2 = service
            .get_links(
                creator,
                Some(PaginateInput {
                    offset: 2,
                    limit: 2,
                }),
            )
            .await
            .expect("get links should succeed");

        // Assert: newest link (created_at = 3_000_000) first, oldest
        // (1_000_000) last, and every link is present exactly once despite
        // random ids and out-of-order creation.
        assert_eq!(page1.data.len(), 2);
        assert_eq!(page1.data[0].id, created_ids[0]);
        assert_eq!(page1.data[1].id, created_ids[2]);
        assert_eq!(page2.data.len(), 1);
        assert_eq!(page2.data[0].id, created_ids[1]);
    }

    #[tokio::test]
    async fn it_should_succeed_get_link_details_with_action() {
        // Arrange
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
                make_gate_validator(&repositories),
            )
            .await
            .expect("create link should succeed");

        // Act
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

        // Assert
        assert_eq!(response.link.id, created.link.id);
        assert_eq!(response.actions.len(), 1);
        assert_eq!(
            response.actions[0].action_type,
            SharedActionType::CreateLink
        );
    }

    /// Seeds a RECEIVE `LinkAction`/`ActionV3` pair directly into the repositories,
    /// bypassing the full create_action flow, so tests can set up a specific
    /// combination of prior claims (e.g. one Success + one still pending) cheaply.
    fn seed_receive_action(
        service: &mut LinkV3Service<TestRepositories>,
        link_id: &str,
        user_id: Principal,
        state: ActionState,
    ) -> String {
        let action_id = random_id_string();
        let action = ActionV3 {
            id: action_id.clone(),
            action_type: ActionType::Receive,
            state,
            creator: user_id,
            creator_address_type: AddressTypeV3::User,
            link_id: link_id.to_string(),
            intent_ids: vec![],
        };
        let link_action = LinkAction {
            link_id: link_id.to_string(),
            action_type: ActionType::Receive,
            action_id: action_id.clone(),
            user_id,
            link_user_state: None,
        };
        service
            .action_service
            .store_action_data(
                link_action,
                action,
                vec![],
                std::collections::HashMap::new(),
                user_id,
            )
            .expect("store action data should succeed");
        action_id
    }

    #[tokio::test]
    async fn it_should_return_all_actions_for_user_with_multiple_claims() {
        // Arrange — a link with two of the same user's RECEIVE actions: one already
        // Success (a prior claim) and one still pending (a resumable in-flight claim).
        // Previously get_link_details only ever surfaced the first action ever
        // created, permanently hiding later claims from the caller.
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let receiver = random_principal_id();
        let link_id = random_id_string();
        service
            .link_v3_repository
            .create(fixture_of_link_v3(&link_id, creator, LinkState::Active));

        seed_receive_action(&mut service, &link_id, receiver, ActionState::Success);
        seed_receive_action(&mut service, &link_id, receiver, ActionState::Created);

        // Act
        let response = service
            .get_link_details(
                receiver,
                &link_id,
                Some(GetLinkOptions {
                    action_type: ActionType::Receive,
                }),
                MockTransactionManagerV3::default(),
            )
            .await
            .expect("get link details should succeed");

        // Assert — both of the user's claims are returned, not just the first.
        assert_eq!(response.actions.len(), 2);
        assert_eq!(response.actions[0].action_state, SharedActionState::Success);
        assert_eq!(response.actions[1].action_state, SharedActionState::Created);
    }

    #[tokio::test]
    async fn it_should_not_call_transaction_manager_for_a_completed_only_action_set() {
        // Arrange — only an already-Success claim (no pending action). The mock
        // transaction manager is configured to fail every create_action call; if
        // get_link_details incorrectly invoked it for the completed action too,
        // this test would fail.
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let receiver = random_principal_id();
        let link_id = random_id_string();
        service
            .link_v3_repository
            .create(fixture_of_link_v3(&link_id, creator, LinkState::Active));

        seed_receive_action(&mut service, &link_id, receiver, ActionState::Success);

        let mut failing_transaction_manager = MockTransactionManagerV3::default();
        failing_transaction_manager.set_failed(true);

        // Act
        let response = service
            .get_link_details(
                receiver,
                &link_id,
                Some(GetLinkOptions {
                    action_type: ActionType::Receive,
                }),
                failing_transaction_manager,
            )
            .await;

        // Assert
        assert!(
            response.is_ok(),
            "a failing transaction manager must not be invoked for a completed action: {response:?}"
        );
        assert_eq!(response.unwrap().actions.len(), 1);
    }

    #[tokio::test]
    async fn it_should_propagate_error_when_pending_action_transaction_manager_fails() {
        // Arrange — a pending (not yet successful) claim. get_link_details must build
        // icrc112_requests for it via the transaction manager, so a failure there must
        // surface as an error rather than being silently swallowed.
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let receiver = random_principal_id();
        let link_id = random_id_string();
        service
            .link_v3_repository
            .create(fixture_of_link_v3(&link_id, creator, LinkState::Active));

        seed_receive_action(&mut service, &link_id, receiver, ActionState::Created);

        let mut failing_transaction_manager = MockTransactionManagerV3::default();
        failing_transaction_manager.set_failed(true);

        // Act
        let response = service
            .get_link_details(
                receiver,
                &link_id,
                Some(GetLinkOptions {
                    action_type: ActionType::Receive,
                }),
                failing_transaction_manager,
            )
            .await;

        // Assert
        assert!(response.is_err());
    }

    #[tokio::test]
    async fn it_should_reject_create_action_when_pending_action_already_exists() {
        // Arrange — the caller already has a pending (not yet successful) RECEIVE
        // action for this link. A second concurrent claim attempt (e.g. two tabs)
        // must be rejected rather than creating a second pending action.
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let receiver = random_principal_id();
        let canister_id = random_principal_id();
        let ledger_id = random_principal_id();
        let created_at = 1_000_000;
        let link_id = random_id_string();
        service
            .link_v3_repository
            .create(fixture_of_link_v3(&link_id, creator, LinkState::Active));

        seed_receive_action(&mut service, &link_id, receiver, ActionState::Created);

        let (token_fee_service, token_standard_service, token_balance_service) =
            fixture_of_services(created_at);

        // Act
        let result = service
            .create_action(
                &link_id,
                fixture_of_shared_action(
                    SharedActionType::Receive,
                    receiver,
                    canister_id,
                    ledger_id,
                ),
                receiver,
                canister_id,
                created_at,
                MockTransactionManagerV3::default(),
                token_fee_service,
                token_standard_service,
                token_balance_service,
                make_gate_validator(&repositories),
                0,
            )
            .await;

        // Assert
        assert!(
            matches!(result, Err(CanisterError::ValidationErrors(_))),
            "creating a second pending action while one exists must be rejected, got {result:?}"
        );
    }

    #[test]
    fn it_should_succeed_disable_link() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let link = fixture_of_link_v3("link-1", creator, LinkState::Active);
        service.link_v3_repository.create(link);

        // Act
        let response = service
            .disable_link(creator, "link-1")
            .expect("disable link should succeed");

        // Assert
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

    #[tokio::test]
    async fn it_should_fail_sync_asset_balance_cache_due_to_invalid_state_created() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let link = fixture_of_link_v3("link-1", creator, LinkState::Created);
        service.link_v3_repository.create(link);
        let token_balance_service = MockTokenBalanceService::new();

        // Act
        let result = service
            .sync_asset_balance_cache(creator, canister_id, "link-1", token_balance_service)
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }

    #[tokio::test]
    async fn it_should_fail_sync_asset_balance_cache_due_to_invalid_state_ended() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = LinkV3Service::new(&repositories);
        let creator = random_principal_id();
        let canister_id = random_principal_id();
        let link = fixture_of_link_v3("link-1", creator, LinkState::Ended);
        service.link_v3_repository.create(link);
        let token_balance_service = MockTokenBalanceService::new();

        // Act
        let result = service
            .sync_asset_balance_cache(creator, canister_id, "link-1", token_balance_service)
            .await;

        // Assert
        assert!(matches!(result, Err(CanisterError::ValidationErrors(_))));
    }

    #[tokio::test]
    async fn it_should_sync_asset_balance_cache_for_inactive_link() {
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
            ..fixture_of_link_v3(&link_id, creator, LinkState::Inactive)
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
    }

    mod update_link_with_process_action_result {
        use super::*;
        use cashier_backend_types::{
            link_v3::action_result::ProcessActionResult,
            repository::{
                action::v1::ActionState,
                action::v3::ActionV3,
                asset::v1::Asset,
                common::{AddressTypeV3, Wallet},
                intent::v1::{IntentState, TransferData},
                intent::v3::{IntentTransactionDataV3, IntentTypeV3, IntentV3},
            },
        };
        use std::collections::HashMap;

        fn fixture_of_receive_intent(asset_address: Principal, amount: u64) -> IntentV3 {
            IntentV3 {
                id: random_id_string(),
                label: "intent".to_string(),
                intent_type: IntentTypeV3::Send,
                asset: AssetV3 {
                    address: asset_address,
                    network_fee: Some(Nat::from(200u64)),
                    token_standard: TokenStandardV3::ICRC2,
                },
                amount: Nat::from(amount),
                total_amount: None,
                network_fee: None,
                user_fee: None,
                source_address: random_principal_id(),
                source_account: None,
                source_address_type: AddressTypeV3::Link,
                dest_address: random_principal_id(),
                dest_account: None,
                dest_address_type: AddressTypeV3::User,
                intent_tx_data: Some(IntentTransactionDataV3::Transfer(TransferData {
                    from: Wallet::default(),
                    to: Wallet::default(),
                    asset: Asset::default(),
                    amount: Nat::from(amount),
                })),
                dependencies: vec![],
                action_id: random_id_string(),
                state: IntentState::Success,
                created_at: 0,
            }
        }

        fn fixture_of_result(
            link: &LinkV3,
            action_type: ActionType,
            intents: Vec<IntentV3>,
            is_success: bool,
        ) -> LinkProcessActionResult {
            LinkProcessActionResult {
                link: link.clone(),
                process_action_result: ProcessActionResult {
                    action: ActionV3 {
                        id: random_id_string(),
                        action_type,
                        link_id: link.id.clone(),
                        creator: random_principal_id(),
                        creator_address_type: AddressTypeV3::User,
                        state: ActionState::Success,
                        intent_ids: vec![],
                    },
                    intents,
                    intent_txs_map: HashMap::new(),
                    icrc112_requests: None,
                    is_success,
                    errors: vec![],
                },
            }
        }

        fn fixture_of_claim_link(id: &str, asset: Principal, max_use: u64) -> LinkV3 {
            LinkV3 {
                asset_info: vec![AssetInfoV3 {
                    available_amount: Some(Nat::from(10_000u64)),
                    ..fixture_of_asset_info_v3(asset, Nat::from(10_000u64))
                }],
                max_use,
                ..fixture_of_link_v3(id, random_principal_id(), LinkState::Active)
            }
        }

        #[test]
        fn it_should_reject_failed_process_action_result_and_keep_stored_link() {
            // Arrange
            let repositories = TestRepositories::new();
            let mut service = LinkV3Service::new(&repositories);
            let asset = random_principal_id();
            let link_id = random_id_string();
            let link = fixture_of_claim_link(&link_id, asset, 3);
            service.link_v3_repository.create(link.clone());
            let result = fixture_of_result(
                &link,
                ActionType::Receive,
                vec![fixture_of_receive_intent(asset, 4_000)],
                false,
            );

            // Act
            let outcome = service.update_link_with_process_action_result(&result);

            // Assert
            assert!(matches!(outcome, Err(CanisterError::ValidationErrors(_))));
            let stored = service
                .link_v3_repository
                .get(&link_id)
                .expect("link should exist");
            assert_eq!(stored.use_count, 0);
            assert_eq!(
                stored.asset_info[0].available_amount,
                Some(Nat::from(10_000u64))
            );
        }

        #[test]
        fn it_should_fail_due_to_missing_link() {
            // Arrange
            let repositories = TestRepositories::new();
            let mut service = LinkV3Service::new(&repositories);
            let asset = random_principal_id();
            let link = fixture_of_claim_link(&random_id_string(), asset, 3);
            // link NOT created in repo
            let result = fixture_of_result(
                &link,
                ActionType::Receive,
                vec![fixture_of_receive_intent(asset, 4_000)],
                true,
            );

            // Act
            let outcome = service.update_link_with_process_action_result(&result);

            // Assert
            assert!(matches!(outcome, Err(CanisterError::NotFound(_))));
        }

        #[test]
        fn it_should_apply_receive_on_fresh_link_and_persist() {
            // Arrange
            let repositories = TestRepositories::new();
            let mut service = LinkV3Service::new(&repositories);
            let asset = random_principal_id();
            let link_id = random_id_string();
            let link = fixture_of_claim_link(&link_id, asset, 3);
            service.link_v3_repository.create(link.clone());
            let result = fixture_of_result(
                &link,
                ActionType::Receive,
                vec![fixture_of_receive_intent(asset, 4_000)],
                true,
            );

            // Act
            let updated = service
                .update_link_with_process_action_result(&result)
                .expect("update should succeed");

            // Assert — returned link matches stored link
            let stored = service
                .link_v3_repository
                .get(&link_id)
                .expect("link should exist");
            assert_eq!(stored.use_count, 1);
            assert_eq!(stored.state, LinkState::Active);
            assert_eq!(
                stored.asset_info[0].available_amount,
                Some(Nat::from(5_800u64)) // 10_000 - 4_000 - 200 fee
            );
            assert_eq!(updated.use_count, stored.use_count);
            assert_eq!(updated.asset_info, stored.asset_info);
        }

        #[test]
        fn it_should_not_lose_concurrent_claim_updates_despite_stale_snapshots() {
            // Arrange — both results carry the SAME stale pre-action snapshot,
            // simulating two claims that read the link before either committed.
            let repositories = TestRepositories::new();
            let mut service = LinkV3Service::new(&repositories);
            let asset = random_principal_id();
            let link_id = random_id_string();
            let stale_snapshot = fixture_of_claim_link(&link_id, asset, 2);
            service.link_v3_repository.create(stale_snapshot.clone());
            let claim_1 = fixture_of_result(
                &stale_snapshot,
                ActionType::Receive,
                vec![fixture_of_receive_intent(asset, 4_000)],
                true,
            );
            let claim_2 = fixture_of_result(
                &stale_snapshot,
                ActionType::Receive,
                vec![fixture_of_receive_intent(asset, 4_000)],
                true,
            );

            // Act
            service
                .update_link_with_process_action_result(&claim_1)
                .expect("claim 1 commit should succeed");
            service
                .update_link_with_process_action_result(&claim_2)
                .expect("claim 2 commit should succeed");

            // Assert — no lost update: both uses counted, both amounts deducted
            let stored = service
                .link_v3_repository
                .get(&link_id)
                .expect("link should exist");
            assert_eq!(stored.use_count, 2);
            assert_eq!(stored.state, LinkState::Ended); // max_use reached
            assert_eq!(
                stored.asset_info[0].available_amount,
                Some(Nat::from(1_600u64)) // 10_000 - 2 * (4_000 + 200)
            );
        }

        #[test]
        fn it_should_fail_apply_and_keep_stored_link_when_deduction_exceeds_available() {
            // Arrange
            let repositories = TestRepositories::new();
            let mut service = LinkV3Service::new(&repositories);
            let asset = random_principal_id();
            let link_id = random_id_string();
            let mut link = fixture_of_claim_link(&link_id, asset, 3);
            link.asset_info[0].available_amount = Some(Nat::from(3_000u64));
            service.link_v3_repository.create(link.clone());
            let result = fixture_of_result(
                &link,
                ActionType::Receive,
                vec![fixture_of_receive_intent(asset, 4_000)],
                true,
            );

            // Act
            let outcome = service.update_link_with_process_action_result(&result);

            // Assert — apply error never reaches storage
            assert!(matches!(outcome, Err(CanisterError::InvalidDataError(_))));
            let stored = service
                .link_v3_repository
                .get(&link_id)
                .expect("link should exist");
            assert_eq!(stored.use_count, 0);
            assert_eq!(
                stored.asset_info[0].available_amount,
                Some(Nat::from(3_000u64))
            );
        }
    }
}
