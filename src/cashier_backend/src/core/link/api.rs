// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::services::link::traits::LinkValidation;
use candid::Principal;
use ic_cdk::{query, update};

use crate::services::link::traits::LinkUserStateMachine;
use crate::{
    core::{
        action::types::{
            ActionDto, CreateActionAnonymousInput, CreateActionInput, ProcessActionAnonymousInput,
            ProcessActionInput,
        },
        guard::is_not_anonymous,
        GetLinkOptions, GetLinkResp, LinkDto, PaginateResult, UpdateLinkInput,
    },
    error,
    services::{
        action::ActionService,
        link::{
            service::LinkService,
            traits::{ActionFlow, LinkStateMachine},
        },
    },
    types::{api::PaginateInput, error::CanisterError},
    utils::runtime::{IcEnvironment, RealIcEnvironment},
};

use super::types::{
    CreateLinkInput, LinkGetUserStateInput, LinkGetUserStateOutput, LinkUpdateUserStateInput,
    UpdateActionInput,
};

/// Retrieves a paginated list of links created by the authenticated caller.
///
/// This endpoint requires the caller to be authenticated (non-anonymous) and returns
/// only the links that were created by the calling principal.
///
/// # Arguments
/// * `input` - Optional pagination parameters (page size, offset, etc.)
///
/// # Returns
/// * `Ok(PaginateResult<LinkDto>)` - Paginated list of links owned by the caller
/// * `Err(String)` - Error message if retrieval fails
#[query(guard = "is_not_anonymous")]
async fn get_links(input: Option<PaginateInput>) -> Result<PaginateResult<LinkDto>, String> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.get_links(input)
}

/// Retrieves a specific link by its ID with optional action data.
///
/// This endpoint is accessible to both anonymous and authenticated users. The response
/// includes the link details and optionally associated action data based on the caller's
/// permissions and the requested action type.
///
/// # Arguments
/// * `id` - The unique identifier of the link to retrieve
/// * `options` - Optional parameters including action type to include in response
///
/// # Returns
/// * `Ok(GetLinkResp)` - Link data with optional action information
/// * `Err(String)` - Error message if link not found or access denied
#[query]
async fn get_link(id: String, options: Option<GetLinkOptions>) -> Result<GetLinkResp, String> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.get_link(&id, options)
}

/// Creates a new link using the v2 API format with enhanced features.
///
/// This endpoint requires authentication and creates a new blockchain transaction link
/// owned by the calling principal. Returns the complete link data structure.
///
/// # Arguments
/// * `input` - Link creation parameters (v2 format with additional features)
///
/// # Returns
/// * `Ok(LinkDto)` - Complete data of the created link
/// * `Err(CanisterError)` - Error if link creation fails
#[update(guard = "is_not_anonymous")]
async fn create_link(input: CreateLinkInput) -> Result<LinkDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.create_link(input).await
}

/// Updates an existing link's configuration or state.
///
/// This endpoint requires authentication and allows the link creator to modify
/// link properties, trigger state transitions, or update link parameters.
///
/// # Arguments
/// * `input` - Link update parameters including ID and new configuration
///
/// # Returns
/// * `Ok(LinkDto)` - Updated link data
/// * `Err(CanisterError)` - Error if update fails or unauthorized
#[update(guard = "is_not_anonymous")]
async fn update_link(input: UpdateLinkInput) -> Result<LinkDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.update_link(input).await
}

/// Processes an existing action for authenticated users.
///
/// This endpoint executes a blockchain action that was previously created by the user.
/// It validates the action state, executes the associated blockchain transactions,
/// and updates the action status accordingly.
///
/// # Arguments
/// * `input` - Action processing parameters including link ID and action type
///
/// # Returns
/// * `Ok(ActionDto)` - Updated action data after processing
/// * `Err(CanisterError)` - Error if processing fails or action not found
#[update(guard = "is_not_anonymous")]
pub async fn process_action(input: ProcessActionInput) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.process_action(input).await
}

/// Creates a new action for authenticated users on a specific link.
///
/// This endpoint allows users to create blockchain actions (like claims, transfers, etc.)
/// on existing links. The action is prepared with all necessary intents and transactions
/// but not immediately executed.
///
/// # Arguments
/// * `input` - Action creation parameters including link ID and action type
///
/// # Returns
/// * `Ok(ActionDto)` - Created action data with associated intents
/// * `Err(CanisterError)` - Error if creation fails or action already exists
#[update(guard = "is_not_anonymous")]
pub async fn create_action(input: CreateActionInput) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.create_action(input).await
}

/// Processes an existing action for anonymous users with wallet address.
///
/// This endpoint allows anonymous users to execute blockchain actions (typically claims)
/// by providing their wallet address. Only supports "Use" action types for security.
/// Actions are executed without requiring user authentication.
///
/// # Arguments
/// * `input` - Anonymous action processing parameters including wallet address
///
/// # Returns
/// * `Ok(ActionDto)` - Updated action data after processing
/// * `Err(CanisterError)` - Error if processing fails or invalid action type
#[update]
pub async fn process_action_anonymous(
    input: ProcessActionAnonymousInput,
) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.process_action_anonymous(input).await
}

/// Creates a new action for anonymous users with wallet address.
///
/// This endpoint allows anonymous users to create blockchain actions (typically claims)
/// by providing their wallet address. Only supports "Use" action types and validates
/// that the action doesn't already exist for the given wallet.
///
/// # Arguments
/// * `input` - Anonymous action creation parameters including wallet address
///
/// # Returns
/// * `Ok(ActionDto)` - Created action data with associated intents
/// * `Err(CanisterError)` - Error if creation fails or action already exists
#[update]
pub async fn create_action_anonymous(
    input: CreateActionAnonymousInput,
) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.create_action_anonymous(input).await
}

/// Retrieves the current user state for a specific link action.
///
/// This endpoint returns the user's current progress/state within a link's action flow.
/// It supports both authenticated users (via session) and anonymous users (via wallet address).
/// Currently only supports "Use" action types for security.
///
/// # Arguments
/// * `input` - Parameters including link ID, action type, and optional wallet address
///
/// # Returns
/// * `Ok(Some(LinkGetUserStateOutput))` - Current user state and action data if found
/// * `Ok(None)` - If no action exists for the user
/// * `Err(CanisterError)` - Error if validation fails or invalid parameters
#[update]
pub async fn link_get_user_state(
    input: LinkGetUserStateInput,
) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.link_get_user_state(&input)
}

/// Updates the user state for a specific link action.
///
/// This endpoint transitions the user through different states in a link's action flow
/// (e.g., from wallet selection to transaction signing). It implements a state machine
/// to guide users through the complete action process.
///
/// # Arguments
/// * `input` - Parameters including link ID, action type, target state, and optional wallet address
///
/// # Returns
/// * `Ok(Some(LinkGetUserStateOutput))` - Updated user state and action data
/// * `Ok(None)` - If state transition is not valid
/// * `Err(CanisterError)` - Error if validation fails or transition not allowed
#[update]
pub async fn link_update_user_state(
    input: LinkUpdateUserStateInput,
) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.link_update_user_state(&input)
}

/// Updates an existing action's state and executes associated transactions.
///
/// This endpoint allows action creators to modify and execute their blockchain actions.
/// It validates ownership, processes the action through the transaction manager,
/// and executes wallet transactions if specified.
///
/// # Arguments
/// * `input` - Action update parameters including action ID and link ID
///
/// # Returns
/// * `Ok(ActionDto)` - Updated action data after processing
/// * `Err(CanisterError)` - Error if update fails, unauthorized, or action not found
#[update(guard = "is_not_anonymous")]
pub async fn update_action(input: UpdateActionInput) -> Result<ActionDto, CanisterError> {
    let start = ic_cdk::api::time();
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    let res = api.update_action(input).await;

    let end = ic_cdk::api::time();

    let _elapsed = end - start; // Track timing for performance monitoring

    res
}

/// Main API controller for blockchain link and action management operations.
///
/// The LinkApi struct serves as the primary interface for all link-related operations
/// including creation, retrieval, updates, and action processing. It orchestrates
/// interactions between multiple services to provide a complete blockchain transaction
/// link management system.
///
/// # Key Responsibilities
/// - Link lifecycle management (create, read, update)
/// - Action processing for both authenticated and anonymous users
/// - User state management within action workflows
/// - Transaction execution and validation
/// - Access control and permission validation
///
/// # Supported Operations
/// - **Link Management**: Create, retrieve, and update blockchain transaction links
/// - **Action Processing**: Execute blockchain actions like claims, transfers, withdrawals
/// - **State Management**: Track user progress through multi-step action workflows  
/// - **Anonymous Support**: Allow anonymous users to interact with links using wallet addresses
/// - **Permission Control**: Enforce creator permissions and action-specific access rules
///
/// # Generic Parameters
/// * `E` - Environment interface for Internet Computer operations (typically `RealIcEnvironment`)
pub struct LinkApi<E: IcEnvironment + Clone> {
    link_service: LinkService<E>,
    action_service: ActionService,
    ic_env: E,
}

impl<E: IcEnvironment + Clone> LinkApi<E> {
    /// Creates a new instance of LinkApi with all required services.
    ///
    /// This method initializes all the dependent services needed for link operations
    /// including link management, user management, transaction processing, and validation.
    pub fn get_instance() -> Self {
        Self {
            link_service: LinkService::get_instance(),
            action_service: ActionService::get_instance(),
            ic_env: E::new(),
        }
    }

    /// Creates a new LinkApi instance with custom service dependencies.
    ///
    /// This constructor is primarily used for testing and dependency injection,
    /// allowing custom implementations of services to be provided.
    ///
    /// # Arguments
    /// * `link_service` - Service for link management operations
    /// * `user_service` - Service for user management operations  
    /// * `tx_manager_service` - Service for transaction processing
    /// * `action_service` - Service for action management
    /// * `ic_env` - Internet Computer environment interface
    /// * `validate_service` - Service for validation operations
    /// * `request_lock_service` - Service for request locking operations
    pub fn new(link_service: LinkService<E>, action_service: ActionService, ic_env: E) -> Self {
        Self {
            link_service,
            action_service,
            ic_env,
        }
    }

    /// Retrieves links created by the calling principal with pagination support.
    ///
    /// This method fetches all links owned by the authenticated caller and converts
    /// them to DTOs for API response. Supports pagination to handle large result sets.
    ///
    /// # Arguments
    /// * `input` - Optional pagination parameters (defaults to first page if None)
    ///
    /// # Returns
    /// * `Ok(PaginateResult<LinkDto>)` - Paginated list of links owned by caller
    /// * `Err(String)` - Error message if retrieval fails
    pub fn get_links(
        &self,
        input: Option<PaginateInput>,
    ) -> Result<PaginateResult<LinkDto>, String> {
        let caller = self.ic_env.caller();

        match self
            .link_service
            .get_links_by_principal(&caller.to_text(), &input.unwrap_or_default())
        {
            Ok(links) => Ok(links.map(LinkDto::from)),
            Err(e) => {
                error!("Failed to get links: {}", e);
                Err(e)
            }
        }
    }

    /// Retrieves a specific link by ID with optional action data based on permissions.
    ///
    /// This method handles complex access control logic:
    /// - Anonymous users can view links but with limited action access
    /// - Authenticated users can access their own actions
    /// - Link creators have full access to all action types
    /// - Non-creators can only access "Use" actions (claims)
    ///
    /// # Arguments
    /// * `id` - The unique identifier of the link to retrieve
    /// * `options` - Optional parameters including action type filter
    ///
    /// # Returns
    /// * `Ok(GetLinkResp)` - Link data with optional action information
    /// * `Err(String)` - Error if link not found or access denied
    pub fn get_link(
        &self,
        id: &str,
        options: Option<GetLinkOptions>,
    ) -> Result<GetLinkResp, String> {
        let caller = self.ic_env.caller();

        // Get raw link and action data from service
        let (link, action) = self.link_service.get_link(id, options, &caller)?;

        // Convert action to DTO if it exists
        let action_dto = action.map(|action| {
            let intents = self.action_service.get_intents_by_action_id(&action.id);
            ActionDto::from(action, intents)
        });

        Ok(GetLinkResp {
            link: LinkDto::from(link),
            action: action_dto,
        })
    }

    /// Creates a new link using the enhanced v2 input format.
    ///
    /// This method creates a blockchain transaction link with enhanced features and
    /// better error handling. Returns the complete link data structure instead of just ID.
    /// The link will be in preview state if validation passes, else it will return an error.
    ///
    /// # Arguments
    /// * `input` - Link creation parameters in v2 format with additional capabilities
    ///
    /// # Returns
    /// * `Ok(LinkDto)` - Complete data of the newly created link
    /// * `Err(CanisterError)` - Error if link creation fails or validation errors occur
    pub async fn create_link(&self, input: CreateLinkInput) -> Result<LinkDto, CanisterError> {
        let creator = self.ic_env.caller();

        match self
            .link_service
            .create_link(creator.to_text(), input)
            .await
        {
            Ok(link) => Ok(LinkDto::from(link)),
            Err(e) => {
                error!("Failed to create link: {}", e);
                Err(e)
            }
        }
    }

    /// Processes an existing action for anonymous users using wallet address authentication.
    ///
    /// This method allows anonymous users to execute blockchain actions (typically claims)
    /// by providing their wallet address. Validates the wallet address format, ensures
    /// only "Use" actions are allowed, and executes the action without requiring user registration.
    ///
    /// # Arguments
    /// * `input` - Anonymous processing parameters including wallet address and action details
    ///
    /// # Returns
    /// * `Ok(ActionDto)` - Updated action data after successful processing
    /// * `Err(CanisterError)` - Error if validation fails, action doesn't exist, or processing fails
    pub async fn process_action_anonymous(
        &self,
        input: ProcessActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError> {
        let caller = self.ic_env.caller();
        if caller != Principal::anonymous() {
            return Err(CanisterError::ValidationErrors(
                "Only anonymous caller can call this function".to_string(),
            ));
        }

        self.link_service.process_action_anonymous(&input).await
    }

    /// Processes an existing action for authenticated users.
    ///
    /// This method executes a blockchain action that was previously created by the user.
    /// It validates the user's identity, checks action existence and permissions, then
    /// processes the action through the transaction manager without executing wallet transactions.
    ///
    /// # Arguments
    /// * `input` - Processing parameters including link ID and action type
    ///
    /// # Returns
    /// * `Ok(ActionDto)` - Updated action data after successful processing
    /// * `Err(CanisterError)` - Error if user not found, action doesn't exist, or processing fails
    pub async fn process_action(
        &self,
        input: ProcessActionInput,
    ) -> Result<ActionDto, CanisterError> {
        let caller = self.ic_env.caller();

        self.link_service.process_action(&input, &caller).await
    }

    /// Creates a new action for authenticated users on a specific link.
    ///
    /// This method allows users to create blockchain actions on existing links. It validates
    /// the user's identity, ensures the action doesn't already exist, assembles all necessary
    /// intents and transactions, then creates the action through the transaction manager.
    ///
    /// # Arguments
    /// * `input` - Action creation parameters including link ID and action type
    ///
    /// # Returns
    /// * `Ok(ActionDto)` - Created action data with all associated intents
    /// * `Err(CanisterError)` - Error if user not found, action exists, or creation fails
    pub async fn create_action(
        &self,
        input: CreateActionInput,
    ) -> Result<ActionDto, CanisterError> {
        let caller = self.ic_env.caller();
        self.link_service.create_action(&input, &caller).await
    }

    /// Creates a new action for anonymous users using wallet address authentication.
    ///
    /// This method allows anonymous users to create blockchain actions (typically claims)
    /// by providing their wallet address. Validates the wallet format, ensures only "Use"
    /// actions are allowed, assembles intents, and creates the action with an anonymous user ID.
    ///
    /// # Arguments
    /// * `input` - Anonymous creation parameters including wallet address and action details
    ///
    /// # Returns
    /// * `Ok(ActionDto)` - Created action data with all associated intents
    /// * `Err(CanisterError)` - Error if validation fails, action exists, or creation fails
    pub async fn create_action_anonymous(
        &self,
        input: CreateActionAnonymousInput,
    ) -> Result<ActionDto, CanisterError> {
        let caller = self.ic_env.caller();

        if caller != Principal::anonymous() {
            Err(CanisterError::ValidationErrors(
                "Only anonymous caller can call this function".to_string(),
            ))
        } else {
            self.link_service.create_action_anonymous(&input).await
        }
    }

    /// Retrieves the current user state for a specific link action.
    ///
    /// This method returns the user's progress within a link's action workflow. It supports
    /// both authenticated users (via session key) and anonymous users (via wallet address).
    /// The method validates input parameters and returns the current action state if found.
    ///
    /// # Arguments
    /// * `input` - Parameters including link ID, action type, and authentication method
    ///
    /// # Returns
    /// * `Ok(Some(LinkGetUserStateOutput))` - Current user state and action data if action exists
    /// * `Ok(None)` - If no action found for the user
    /// * `Err(CanisterError)` - Error if validation fails or conflicting authentication methods
    pub fn link_get_user_state(
        &self,
        input: &LinkGetUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
        let caller = self.ic_env.caller();

        self.link_service.link_get_user_state(&caller, input)
    }

    /// Updates the user state for a specific link action using state machine transitions.
    ///
    /// This method implements a state machine to guide users through different stages of
    /// an action workflow (e.g., wallet selection → transaction signing → completion).
    /// It validates the transition request and updates the user's progress accordingly.
    ///
    /// # Arguments
    /// * `input` - Parameters including link ID, action type, target state, and authentication method
    ///
    /// # Returns
    /// * `Ok(Some(LinkGetUserStateOutput))` - Updated user state and action data after transition
    /// * `Ok(None)` - If state transition is not valid or action not found
    /// * `Err(CanisterError)` - Error if validation fails or transition not allowed
    pub fn link_update_user_state(
        &self,
        input: &LinkUpdateUserStateInput,
    ) -> Result<Option<LinkGetUserStateOutput>, CanisterError> {
        let caller = self.ic_env.caller();

        self.link_service.link_update_user_state(&caller, input)
    }

    /// Updates an existing action's state and executes associated blockchain transactions.
    ///
    /// This method allows action creators to modify their actions and execute the associated
    /// blockchain transactions. It validates ownership, processes the action through the
    /// transaction manager, and executes wallet transactions when specified.
    ///
    /// # Arguments
    /// * `input` - Update parameters including action ID and link ID
    ///
    /// # Returns
    /// * `Ok(ActionDto)` - Updated action data after processing and transaction execution
    /// * `Err(CanisterError)` - Error if unauthorized, validation fails, or execution fails
    pub async fn update_action(
        &self,
        input: UpdateActionInput,
    ) -> Result<ActionDto, CanisterError> {
        let caller = self.ic_env.caller();
        self.link_service.update_action(&input, &caller).await
    }

    /// Updates an existing link's configuration, state, or parameters.
    ///
    /// This method allows link creators to modify their links by triggering state transitions
    /// or updating link parameters. It validates ownership, retrieves the current link state,
    /// and processes the requested changes through the link service.
    ///
    /// # Arguments
    /// * `input` - Update parameters including link ID, action type, and new parameters
    ///
    /// # Returns
    /// * `Ok(LinkDto)` - Updated link data after successful modification
    /// * `Err(CanisterError)` - Error if unauthorized, link not found, or update fails
    pub async fn update_link(&self, input: UpdateLinkInput) -> Result<LinkDto, CanisterError> {
        let creator = self.ic_env.caller();

        // Get link
        let link = match self.link_service.get_link_by_id(&input.id) {
            Ok(rsp) => rsp,
            Err(e) => {
                error!("Failed to get link: {:#?}", e);
                return Err(e);
            }
        };

        // Verify creator
        if !self
            .link_service
            .is_link_creator(&creator.to_text(), &input.id)
        {
            return Err(CanisterError::Unauthorized(
                "Caller are not the creator of this link".to_string(),
            ));
        }

        // Validate link type
        let link_type = link.link_type;
        if link_type.is_none() {
            return Err(CanisterError::ValidationErrors(
                "Link type is missing".to_string(),
            ));
        }

        let params = input.params.clone();
        let updated_link = self
            .link_service
            .handle_link_state_transition(&input.id, &input.action, params)
            .await?;

        Ok(LinkDto::from(updated_link))
    }
}
