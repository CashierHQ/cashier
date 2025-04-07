use std::str::FromStr;

use candid::Principal;
use cashier_types::{
    Action, ActionState, ActionType, Asset, AssetInfo, Chain, Intent, IntentState, IntentTask,
    IntentType, Link, LinkAction, LinkState, LinkType, LinkUserState, UserLink, Wallet,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    constant::{ICP_CANISTER_ID, INTENT_LABEL_WALLET_TO_LINK, INTENT_LABEL_WALLET_TO_TREASURY},
    core::link::types::{
        LinkStateMachineAction, LinkStateMachineActionParams, UserStateMachineGoto,
    },
    domains::fee::Fee,
    info,
    repositories::{self, action::ActionRepository, link_action::LinkActionRepository},
    types::{
        api::{PaginateInput, PaginateResult},
        error::CanisterError,
    },
    utils::{helper::to_subaccount, icrc::IcrcService, runtime::IcEnvironment},
    warn,
};

#[cfg_attr(test, faux::create)]
pub struct LinkService<E: IcEnvironment + Clone> {
    // LinkService fields go here
    link_repository: repositories::link::LinkRepository,
    link_action_repository: LinkActionRepository,
    action_repository: ActionRepository,
    icrc_service: IcrcService,
    ic_env: E,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> LinkService<E> {
    pub fn new(
        link_repository: repositories::link::LinkRepository,
        link_action_repository: LinkActionRepository,
        action_repository: ActionRepository,
        icrc_service: IcrcService,
        ic_env: E,
    ) -> Self {
        Self {
            link_repository,
            link_action_repository,
            action_repository,
            icrc_service,
            ic_env,
        }
    }

    pub fn get_instance() -> Self {
        Self {
            link_repository: repositories::link::LinkRepository::new(),
            link_action_repository: LinkActionRepository::new(),
            action_repository: ActionRepository::new(),
            icrc_service: IcrcService::new(),
            ic_env: E::new(),
        }
    }

    pub fn get_link_by_id(&self, id: String) -> Result<Link, CanisterError> {
        let link = self
            .link_repository
            .get(&id)
            .ok_or_else(|| CanisterError::NotFound("link not found".to_string()))?;

        Ok(link)
    }

    pub fn look_up_intent(
        &self,
        link_type: &LinkType,
        action_type: &ActionType,
    ) -> Option<Vec<Intent>> {
        let mut intents: Vec<Intent> = vec![];
        match (link_type, action_type) {
            (LinkType::TipLink, ActionType::CreateLink) => {
                // create intent for transfer asset to link
                let ts = self.ic_env.time();
                //TODO: get the intent template from config then map the values
                let mut transfer_asset_intent = Intent::default();
                let transfer_data = IntentType::default_transfer();
                transfer_asset_intent.r#type = transfer_data;
                transfer_asset_intent.task = IntentTask::TransferWalletToLink;
                transfer_asset_intent.id = Uuid::new_v4().to_string();
                transfer_asset_intent.state = IntentState::Created;
                transfer_asset_intent.created_at = ts;
                transfer_asset_intent.label = INTENT_LABEL_WALLET_TO_LINK.to_string();
                // adding dependency

                // create intent for transfer fee to treasury
                //TODO: get the intent template from config then map the values
                let mut transfer_fee_intent = Intent::default();
                let transfer_fee_data = IntentType::default_transfer_from();
                transfer_fee_intent.r#type = transfer_fee_data;
                transfer_fee_intent.task = IntentTask::TransferWalletToTreasury;
                transfer_fee_intent.id = Uuid::new_v4().to_string();
                transfer_fee_intent.state = IntentState::Created;
                transfer_fee_intent.created_at = ts;
                transfer_fee_intent.label = INTENT_LABEL_WALLET_TO_TREASURY.to_string();
                // adding dependency

                intents.push(transfer_asset_intent);
                intents.push(transfer_fee_intent);
            }
            (LinkType::TipLink, ActionType::Claim) => {
                // create intent for link asset to user wallet
                let ts = self.ic_env.time();
                //TODO: get the intent template from config then map the values
                let mut intent = Intent::default();
                let transfer_data = IntentType::default_transfer();
                intent.r#type = transfer_data;
                intent.task = IntentTask::TransferLinkToWallet;
                intent.id = Uuid::new_v4().to_string();
                intent.state = IntentState::Created;
                intent.created_at = ts;
                // same label with transfer asset to link
                intent.label = INTENT_LABEL_WALLET_TO_LINK.to_string();

                intents.push(intent);
            }
            _ => return None,
        }
        return Some(intents);
    }

    pub fn assemble_intents(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_wallet: &Principal,
    ) -> Result<Vec<Intent>, CanisterError> {
        let link = self.get_link_by_id(link_id.to_string())?;

        let temp_intents = self.look_up_intent(&link.link_type.unwrap(), action_type);

        if temp_intents.is_none() {
            return Err(CanisterError::HandleLogicError(
                "Not found intents config for {link_type}_{action_type}".to_string(),
            ));
        }

        let mut intents = temp_intents.unwrap();

        // enrich data for intent
        for intent in intents.iter_mut() {
            match intent.task.clone() {
                IntentTask::TransferWalletToLink => {
                    let mut transfer_data = intent.r#type.as_transfer().unwrap();
                    let asset_info = link.get_asset_by_label(&intent.label).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            "[link_assemble_intents] task TransferWalletToLink Asset not found"
                                .to_string(),
                        )
                    })?;

                    transfer_data.amount = asset_info.total_amount;
                    transfer_data.asset = Asset {
                        address: asset_info.address.clone(),
                        chain: asset_info.chain.clone(),
                    };
                    let from_account = Account {
                        owner: user_wallet.clone(),
                        subaccount: None,
                    };
                    transfer_data.from = Wallet {
                        address: from_account.to_string(),
                        chain: Chain::IC,
                    };
                    let to_account = Account {
                        owner: self.ic_env.id(),
                        subaccount: Some(to_subaccount(&link.id.clone())),
                    };
                    transfer_data.to = Wallet {
                        address: to_account.to_string(),
                        chain: Chain::IC,
                    };

                    intent.r#type = IntentType::Transfer(transfer_data.clone());
                }
                IntentTask::TransferWalletToTreasury => {
                    let mut transfer_from_data = intent.r#type.as_transfer_from().unwrap();
                    let caller_account = Account {
                        owner: user_wallet.clone(),
                        subaccount: None,
                    };
                    let spender_wallet = Wallet {
                        address: Account {
                            owner: self.ic_env.id(),
                            subaccount: None,
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };
                    let vault_wallet = Wallet {
                        address: Account {
                            // TODO: change to treasury account
                            owner: self.ic_env.id(),
                            subaccount: None,
                        }
                        .to_string(),
                        chain: Chain::IC,
                    };
                    let approve_wallet = Wallet {
                        address: caller_account.to_string(),
                        chain: Chain::IC,
                    };

                    transfer_from_data.spender = spender_wallet;
                    transfer_from_data.to = vault_wallet;
                    transfer_from_data.from = approve_wallet;
                    transfer_from_data.asset = Asset {
                        address: ICP_CANISTER_ID.to_string(),
                        chain: Chain::IC,
                    };
                    transfer_from_data.amount = Fee::CreateTipLinkFeeIcp.as_u64();

                    intent.r#type = IntentType::TransferFrom(transfer_from_data.clone());
                }
                IntentTask::TransferLinkToWallet => {
                    let mut transfer_data = intent.r#type.as_transfer().unwrap();
                    let asset_info = link.get_asset_by_label(&intent.label).ok_or_else(|| {
                        CanisterError::HandleLogicError(
                            "[link_assemble_intents] task TransferLinkToWallet Asset not found"
                                .to_string(),
                        )
                    })?;

                    transfer_data.amount = asset_info.total_amount;
                    transfer_data.asset = Asset {
                        address: asset_info.address.clone(),
                        chain: asset_info.chain.clone(),
                    };

                    let from_account = Account {
                        owner: self.ic_env.id(),
                        subaccount: Some(to_subaccount(&link.id.clone())),
                    };
                    transfer_data.from = Wallet {
                        address: from_account.to_string(),
                        chain: Chain::IC,
                    };
                    let to_account = user_wallet.clone();
                    transfer_data.to = Wallet {
                        address: to_account.to_string(),
                        chain: Chain::IC,
                    };

                    intent.r#type = IntentType::Transfer(transfer_data.clone());
                }
                _ => {
                    return Err(CanisterError::HandleLogicError(
                        "Not found intents config for {link_type}_{action_type}".to_string(),
                    ));
                }
            }
        }

        Ok(intents)
    }

    pub fn get_action_of_link(
        &self,
        link_id: &str,
        action_type: &str,
        user_id: &str,
    ) -> Option<Action> {
        let link_actions = self.link_action_repository.get_by_prefix(
            link_id.to_string(),
            action_type.to_string(),
            user_id.to_string(),
        );

        if link_actions.is_empty() {
            return None;
        }

        let action = self
            .action_repository
            .get(link_actions[0].action_id.clone());

        return action;
    }

    // this method validate for each action type
    // create link: only creator can create link
    // withdraw: only creator can withdraw
    // claim: any one can claim
    pub async fn link_validate_user_create_action(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_id: &str,
        caller: &Principal,
    ) -> Result<(), CanisterError> {
        // get link
        let link = self.get_link_by_id(link_id.to_string()).unwrap();

        info!("link data: {:#?}", link);

        match action_type {
            ActionType::CreateLink => {
                // validate user id == link creator
                if link.creator == user_id {
                    // validate user’s balance
                    self.link_validate_balance_with_asset_info(action_type, link_id, caller)
                        .await?;
                    return Ok(());
                } else {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ));
                }
            }
            ActionType::Withdraw => {
                // validate user id == link creator
                if link.creator == user_id {
                    //TODO : validate link's balance, link state
                    return Ok(());
                } else {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the link".to_string(),
                    ));
                }
            }
            ActionType::Claim => {
                // validate link state
                info!("link state: {:#?}", link.state);
                if link.state != LinkState::Active {
                    return Err(CanisterError::ValidationErrors(
                        "Link is not active".to_string(),
                    ));
                }

                // validate link balance
                let asset = link.asset_info.clone().ok_or_else(|| {
                    CanisterError::HandleLogicError("Asset info not found".to_string())
                })?;
                let asset_address = asset[0].address.clone();

                let link_balance = self
                    .icrc_service
                    .balance_of(
                        Principal::from_text(asset_address).unwrap(),
                        Account {
                            owner: self.ic_env.id(),
                            subaccount: Some(to_subaccount(&link.id.clone())),
                        },
                    )
                    .await
                    .map_err(|e| e)?;

                if link_balance <= 0 {
                    return Err(CanisterError::ValidationErrors(
                        "Not enough asset".to_string(),
                    ));
                }

                return Ok(());
            } // validate creator and balance
              // _ => {
              //     return Ok(());
              // }
        }
    }

    pub async fn link_validate_user_update_action(
        &self,
        action: &Action,
        user_id: &str,
        caller: &Principal,
    ) -> Result<(), CanisterError> {
        //validate user_id
        match action.r#type.clone() {
            ActionType::CreateLink => {
                let link = self.get_link_by_id(action.link_id.clone())?;
                if !(action.creator == user_id && link.creator == user_id) {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }

                self.link_validate_balance_with_asset_info(&action.r#type, &link.id, caller)
                    .await?;
            }
            ActionType::Withdraw => {
                let link = self.get_link_by_id(action.link_id.clone())?;
                if !(action.creator == user_id && link.creator == user_id) {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }
            }
            ActionType::Claim => {
                if action.creator != user_id {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }
            }
        }

        return Ok(());
    }

    pub async fn link_validate_balance_with_asset_info(
        &self,
        action_type: &ActionType,
        link_id: &str,
        user: &Principal,
    ) -> Result<(), CanisterError> {
        if action_type != &ActionType::CreateLink {
            return Ok(());
        }

        let link = self
            .get_link_by_id(link_id.to_string())
            .map_err(|e| CanisterError::NotFound(e.to_string()))?;

        let asset_info = link
            .asset_info
            .clone()
            .ok_or_else(|| CanisterError::NotFound("Asset info not found".to_string()))?;

        for asset in asset_info {
            let token_pid = Principal::from_text(asset.address.as_str()).map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Error converting token address to principal: {:?}",
                    e
                ))
            })?;

            let account = Account {
                owner: *user,
                subaccount: None,
            };

            let balance = self
                .icrc_service
                .balance_of(token_pid, account)
                .await
                .map_err(|e| e)?;

            if balance <= asset.total_amount {
                return Err(CanisterError::ValidationErrors(format!(
                    "Insufficient balance for asset: {}, balance: {}, required: {} and fee try smaller amount",
                    asset.address, balance, asset.total_amount
                )));
            }
        }

        Ok(())
    }

    pub fn validate_asset_left(&self, link_id: &str) -> () {}

    pub fn get_link_action_user(
        &self,
        link_id: String,
        action_type: String,
        user_id: String,
    ) -> Result<Option<LinkAction>, CanisterError> {
        let link_action = self.link_action_repository.get_by_prefix(
            link_id.clone(),
            action_type.clone(),
            user_id.clone(),
        );

        if link_action.is_empty() {
            return Ok(None);
        }

        Ok(Some(link_action[0].clone()))
    }

    pub fn handle_user_link_state_machine(
        &self,
        link_id: String,
        action_type: String,
        user_id: String,
        goto: UserStateMachineGoto,
    ) -> Result<LinkAction, CanisterError> {
        // check inputs that can be changed this state
        let action_list = self.link_action_repository.get_by_prefix(
            link_id.clone(),
            action_type.clone(),
            user_id.clone(),
        );

        if action_list.is_empty() {
            return Err(CanisterError::NotFound("Link action not found".to_string()));
        }

        let mut link_action = action_list[0].clone();

        // Validate current state
        let current_user_state = link_action
            .link_user_state
            .clone()
            .ok_or_else(|| CanisterError::HandleLogicError("unknown state".to_string()))?;

        // Flattened state transitions using if/else
        let new_state;

        // Check if we're in final state (CompletedLink)
        if current_user_state == LinkUserState::CompletedLink {
            return Err(CanisterError::HandleLogicError(
                "current state is final state".to_string(),
            ));
        }
        // Check for valid transition: ChooseWallet -> CompletedLink
        else if current_user_state == LinkUserState::ChooseWallet
            && goto == UserStateMachineGoto::Continue
        {
            // Validate the action exists and is successful
            let action = self
                .get_action_of_link(&link_id, &action_type, &user_id)
                .ok_or_else(|| CanisterError::NotFound("Action not found".to_string()))?;

            if action.state != ActionState::Success {
                return Err(CanisterError::HandleLogicError(
                    "Action is not success".to_string(),
                ));
            }

            // Set the new state
            new_state = LinkUserState::CompletedLink;
        }
        // Any other transition is invalid
        else {
            return Err(CanisterError::HandleLogicError(format!(
                "current state {:#?} is not allowed to transition: {:#?}",
                current_user_state, goto
            )));
        }

        // Only update the state field
        link_action.link_user_state = Some(new_state);

        // Update in repository
        self.link_action_repository.update(link_action.clone());

        // Return the updated link_action
        Ok(link_action)
    }

    /// Updates link properties after an action completes
    /// Returns true if link properties were updated, false otherwise
    pub fn update_link_properties(
        &self,
        link_id: String,
        action_id: String,
    ) -> Result<bool, CanisterError> {
        // Get the link and action
        let link = self.get_link_by_id(link_id.clone())?;
        let action = match self.action_repository.get(action_id.clone()) {
            Some(action) => action,
            None => return Ok(false),
        };

        info!("[update_link_properties] link: {:#?}", link);
        info!("[update_link_properties] action: {:#?}", action);

        // Early return if not a successful claim on a TipLink
        if action.state != ActionState::Success {
            return Ok(false);
        }

        // At this point we know we have a successful claim on a TipLink
        // Update link's properties here
        let mut updated_link = link.clone();

        // update tip link's total_claim
        if link.link_type == Some(LinkType::TipLink) && action.r#type == ActionType::Claim {
            info!("[update_link_properties] updating total_claim for TipLink");
            // Update asset info to track the claim
            if let Some(mut asset_info) = updated_link.asset_info.clone() {
                for asset in asset_info.iter_mut() {
                    asset.total_claim += 1;
                }
                updated_link.asset_info = Some(asset_info);
            }
        }

        // Save the updated link
        self.link_repository.update(updated_link);

        // Return true to indicate that we updated the link
        Ok(true)
    }

    pub async fn handle_link_state_choose_link_type(
        &self,
        link: Link,
        action: LinkStateMachineAction,
        params: Option<LinkStateMachineActionParams>,
    ) -> Result<Link, CanisterError> {
        match action {
            LinkStateMachineAction::Continue => {
                let mut updated_link = link.clone();
                updated_link.state = LinkState::AddAssets;

                if let Some(update_params) = params {
                    updated_link = self.apply_update_params(updated_link, update_params)?;
                }

                self.link_repository.update(updated_link.clone());

                Ok(updated_link)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Invalid action for ChooseLinkType state".to_string(),
            )),
        }
    }

    pub async fn handle_link_state_add_assets(
        &self,
        link: Link,
        action: LinkStateMachineAction,
        params: Option<LinkStateMachineActionParams>,
    ) -> Result<Link, CanisterError> {
        match action {
            LinkStateMachineAction::Continue => {
                let mut updated_link = link.clone();
                updated_link.state = LinkState::CreateLink;

                if let Some(update_params) = params {
                    updated_link = self.apply_update_params(updated_link, update_params)?;
                }

                self.link_repository.update(updated_link.clone());

                Ok(updated_link)
            }
            LinkStateMachineAction::Back => {
                self.validate_no_create_action(&link.id, &link.creator)?;

                let mut updated_link = link.clone();
                updated_link.state = LinkState::ChooseLinkType;

                if let Some(update_params) = params {
                    updated_link = self.apply_update_params(updated_link, update_params)?;
                }

                self.link_repository.update(updated_link.clone());

                Ok(updated_link)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Invalid action for AddAssets state".to_string(),
            )),
        }
    }

    pub async fn handle_link_state_create_link(
        &self,
        link: Link,
        action: LinkStateMachineAction,
        params: Option<LinkStateMachineActionParams>,
    ) -> Result<Link, CanisterError> {
        match action {
            LinkStateMachineAction::Continue => {
                self.validate_link_before_active(&link)?;

                let mut updated_link = link.clone();
                updated_link.state = LinkState::Active;

                if let Some(update_params) = params {
                    updated_link = self.apply_update_params(updated_link, update_params)?;
                }

                self.link_repository.update(updated_link.clone());

                Ok(updated_link)
            }
            LinkStateMachineAction::Back => {
                self.validate_no_create_action(&link.id, &link.creator)?;

                let mut updated_link = link.clone();
                updated_link.state = LinkState::AddAssets;

                if let Some(update_params) = params {
                    updated_link = self.apply_update_params(updated_link, update_params)?;
                }

                self.link_repository.update(updated_link.clone());

                Ok(updated_link)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Invalid action for CreateLink state".to_string(),
            )),
        }
    }

    pub async fn handle_link_state_active(
        &self,
        link: Link,
        action: LinkStateMachineAction,
        params: Option<LinkStateMachineActionParams>,
    ) -> Result<Link, CanisterError> {
        match action {
            LinkStateMachineAction::Continue => {
                let mut updated_link = link.clone();
                updated_link.state = LinkState::Inactive;

                if let Some(update_params) = params {
                    updated_link = self.apply_update_params(updated_link, update_params)?;
                }

                self.link_repository.update(updated_link.clone());

                Ok(updated_link)
            }
            _ => Err(CanisterError::ValidationErrors(
                "Invalid action for Active state".to_string(),
            )),
        }
    }

    pub async fn handle_link_state_inactive(
        &self,
        link: Link,
        action: LinkStateMachineAction,
        params: Option<LinkStateMachineActionParams>,
    ) -> Result<Link, CanisterError> {
        Err(CanisterError::ValidationErrors(
            "No valid transitions from Inactive state".to_string(),
        ))
    }

    pub async fn handle_link_state_transition(
        &self,
        link_id: &str,
        action: String,
        params: Option<LinkStateMachineActionParams>,
    ) -> Result<Link, CanisterError> {
        let link = self.get_link_by_id(link_id.to_string())?;

        let state_action = LinkStateMachineAction::from_string(&action)
            .map_err(|e| CanisterError::ValidationErrors(e))?;

        match link.state {
            LinkState::ChooseLinkType => {
                self.handle_link_state_choose_link_type(link, state_action, params)
                    .await
            }
            LinkState::AddAssets => {
                self.handle_link_state_add_assets(link, state_action, params)
                    .await
            }
            LinkState::CreateLink => {
                self.handle_link_state_create_link(link, state_action, params)
                    .await
            }
            LinkState::Active => {
                self.handle_link_state_active(link, state_action, params)
                    .await
            }
            LinkState::Inactive => {
                self.handle_link_state_inactive(link, state_action, params)
                    .await
            }
        }
    }

    fn apply_update_params(
        &self,
        mut link: Link,
        params: LinkStateMachineActionParams,
    ) -> Result<Link, CanisterError> {
        match params {
            LinkStateMachineActionParams::Update(input) => {
                if let Some(title) = input.title {
                    link.title = Some(title);
                }

                if let Some(description) = input.description {
                    link.description = Some(description);
                }

                if let Some(link_image_url) = input.link_image_url {
                    link.metadata = Some(link.metadata.unwrap_or_default());
                    link.metadata
                        .as_mut()
                        .unwrap()
                        .insert("link_image_url".to_string(), link_image_url);
                }

                if let Some(nft_image) = input.nft_image {
                    link.metadata = Some(link.metadata.unwrap_or_default());
                    link.metadata
                        .as_mut()
                        .unwrap()
                        .insert("nft_image".to_string(), nft_image);
                }

                if let Some(asset_info) = input.asset_info {
                    link.asset_info = Some(
                        asset_info
                            .iter()
                            .map(|a| {
                                let chain = std::str::FromStr::from_str(a.chain.as_str())
                                    .unwrap_or(Chain::IC);

                                AssetInfo {
                                    address: a.address.clone(),
                                    chain,
                                    total_amount: a.total_amount,
                                    amount_per_claim: a.amount_per_claim,
                                    label: a.label.clone(),
                                    total_claim: 0,
                                }
                            })
                            .collect(),
                    );
                }

                if let Some(template) = input.template {
                    link.template = std::str::FromStr::from_str(template.as_str()).ok();
                }

                if let Some(link_type) = input.link_type {
                    link.link_type = std::str::FromStr::from_str(link_type.as_str()).ok();
                }
            }
        }

        Ok(link)
    }

    fn validate_no_create_action(&self, link_id: &str, creator: &str) -> Result<(), CanisterError> {
        let link_actions = self.link_action_repository.get_by_prefix(
            link_id.to_string(),
            ActionType::CreateLink.to_string(),
            creator.to_string(),
        );

        if !link_actions.is_empty() {
            return Err(CanisterError::ValidationErrors(
                "Action exists, cannot transition back".to_string(),
            ));
        }

        Ok(())
    }

    fn validate_link_before_active(&self, link: &Link) -> Result<(), CanisterError> {
        let link_actions = self.link_action_repository.get_by_prefix(
            link.id.clone(),
            ActionType::CreateLink.to_string(),
            link.creator.clone(),
        );

        if link_actions.is_empty() {
            return Err(CanisterError::ValidationErrors(
                "Create action not found".to_string(),
            ));
        }

        if link.title.is_none() {
            return Err(CanisterError::ValidationErrors(
                "Title is required".to_string(),
            ));
        }

        if link.description.is_none() {
            return Err(CanisterError::ValidationErrors(
                "Description is required".to_string(),
            ));
        }

        if link.asset_info.is_none() || link.asset_info.as_ref().unwrap().is_empty() {
            return Err(CanisterError::ValidationErrors(
                "Asset info is required".to_string(),
            ));
        }

        Ok(())
    }

    /// Create a new link
    pub fn create_new(
        &self,
        creator: String,
        input: crate::core::link::types::CreateLinkInput,
    ) -> Result<String, String> {
        let user_wallet_repository = repositories::user_wallet::UserWalletRepository::new();
        let user_wallet = user_wallet_repository
            .get(&creator)
            .ok_or_else(|| "User not found".to_string())?;

        let user_id = user_wallet.user_id;

        let ts = self.ic_env.time();
        let id = Uuid::new_v4();
        let link_id_str = id.to_string();

        let link_type = LinkType::from_str(input.link_type.as_str())
            .map_err(|_| "Invalid link type".to_string())?;

        let new_link = Link {
            id: link_id_str.clone(),
            state: LinkState::ChooseLinkType,
            title: None,
            description: None,
            link_type: Some(link_type),
            asset_info: None,
            template: Some(cashier_types::Template::Central),
            creator: user_id.clone(),
            create_at: ts,
            metadata: None,
        };
        let new_user_link = UserLink {
            user_id: user_id.clone(),
            link_id: link_id_str.clone(),
        };

        let user_link_repository = repositories::user_link::UserLinkRepository::new();

        self.link_repository.create(new_link);
        user_link_repository.create(new_user_link);

        Ok(link_id_str)
    }

    /// Get links by principal
    pub fn get_links_by_principal(
        &self,
        principal: String,
        pagination: PaginateInput,
    ) -> Result<PaginateResult<Link>, String> {
        let user_wallet_repository = repositories::user_wallet::UserWalletRepository::new();
        let user_wallet = user_wallet_repository
            .get(&principal)
            .ok_or_else(|| "User not found".to_string())?;

        let user_id = user_wallet.user_id;

        let links = match self.get_links_by_user_id(user_id, pagination) {
            Ok(link_users) => link_users,
            Err(e) => return Err(e),
        };

        Ok(links)
    }

    /// Get links by user ID
    pub fn get_links_by_user_id(
        &self,
        user_id: String,
        pagination: PaginateInput,
    ) -> Result<PaginateResult<Link>, String> {
        let user_link_repository = repositories::user_link::UserLinkRepository::new();
        let user_links = user_link_repository.get_links_by_user_id(user_id, pagination);

        let link_ids = user_links
            .data
            .iter()
            .map(|link_user| link_user.link_id.clone())
            .collect();

        let links = self.link_repository.get_batch(link_ids);

        let res = PaginateResult::new(links, user_links.metadata);
        Ok(res)
    }

    /// Get link action
    pub fn get_link_action(
        &self,
        link_id: String,
        action_type: String,
        user_id: String,
    ) -> Option<Action> {
        let link_actions = self
            .link_action_repository
            .get_by_prefix(link_id, action_type, user_id);

        if link_actions.is_empty() {
            return None;
        }

        let action_id = link_actions.first().unwrap().action_id.clone();
        self.action_repository.get(action_id)
    }

    /// Check if caller is the creator of a link
    pub fn is_link_creator(&self, caller: String, link_id: &String) -> bool {
        let user_wallet_repository = repositories::user_wallet::UserWalletRepository::new();
        let user_wallet = match user_wallet_repository.get(&caller) {
            Some(u) => u,
            None => {
                warn!("User not found");
                return false;
            }
        };

        match self.link_repository.get(&link_id) {
            None => false,
            Some(link_detail) => link_detail.creator == user_wallet.user_id,
        }
    }

    /// Check if link exists
    pub fn is_link_exist(&self, link_id: String) -> bool {
        self.link_repository.get(&link_id).is_some()
    }
}
