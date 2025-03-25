use candid::Principal;
use cashier_types::{
    Action, ActionState, ActionType, Asset, Chain, Intent, IntentState, IntentTask, IntentType,
    Link, LinkAction, LinkState, LinkType, LinkUserState, Wallet,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    constant::{ICP_CANISTER_ID, INTENT_LABEL_WALLET_TO_LINK, INTENT_LABEL_WALLET_TO_TREASURY},
    core::link::types::UserStateMachineGoto,
    info,
    repositories::{self, action::ActionRepository, link_action::LinkActionRepository},
    services::transaction_manager::fee::Fee,
    types::error::CanisterError,
    utils::{helper::to_subaccount, icrc::IcrcService, runtime::IcEnvironment},
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

    pub fn link_assemble_intents(
        &self,
        link_id: &str,
        action_type: &ActionType,
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
                        owner: self.ic_env.caller(),
                        subaccount: None,
                    };
                    transfer_data.from = Wallet {
                        address: from_account.to_string(),
                        chain: Chain::IC,
                    };
                    let to_account = Account {
                        owner: self.ic_env.id(),
                        subaccount: Some(to_subaccount(link.id.clone())),
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
                        owner: self.ic_env.caller(),
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
                    info!("intent: {:#?}", intent);
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
                        subaccount: Some(to_subaccount(link.id.clone())),
                    };
                    transfer_data.from = Wallet {
                        address: from_account.to_string(),
                        chain: Chain::IC,
                    };
                    let to_account = Account {
                        owner: self.ic_env.caller(),
                        subaccount: None,
                    };
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

                // TODO: validate link's balance
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
}
