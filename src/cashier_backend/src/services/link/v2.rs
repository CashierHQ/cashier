use std::str::FromStr;

use candid::Principal;
use cashier_types::{
    Action, ActionState, ActionType, Asset, AssetInfo, Chain, Intent, IntentState, IntentTask,
    IntentType, Link, LinkAction, LinkState, LinkType, LinkUserState, Template, UserLink, Wallet,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    constant::{
        ICP_CANISTER_ID, INTENT_LABEL_LINK_CREATION_FEE, INTENT_LABEL_RECEIVE_PAYMENT_ASSET,
        INTENT_LABEL_SEND_AIRDROP_ASSET, INTENT_LABEL_SEND_TIP_ASSET,
        INTENT_LABEL_SEND_TOKEN_BASKET_ASSET,
    },
    core::link::types::{LinkDetailUpdateInput, LinkStateMachineGoto, UserStateMachineGoto},
    domains::fee::Fee,
    error, info,
    repositories::{
        self, action::ActionRepository, link_action::LinkActionRepository,
        user_wallet::UserWalletRepository,
    },
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
    user_wallet_repository: UserWalletRepository,
    ic_env: E,
}

#[cfg_attr(test, faux::methods)]
impl<E: IcEnvironment + Clone> LinkService<E> {
    pub fn new(
        link_repository: repositories::link::LinkRepository,
        link_action_repository: LinkActionRepository,
        action_repository: ActionRepository,
        icrc_service: IcrcService,
        user_wallet_repository: UserWalletRepository,
        ic_env: E,
    ) -> Self {
        Self {
            link_repository,
            link_action_repository,
            action_repository,
            icrc_service,
            user_wallet_repository,
            ic_env,
        }
    }

    pub fn get_instance() -> Self {
        Self {
            link_repository: repositories::link::LinkRepository::new(),
            link_action_repository: LinkActionRepository::new(),
            action_repository: ActionRepository::new(),
            icrc_service: IcrcService::new(),
            user_wallet_repository: UserWalletRepository::new(),
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
        link: &Link,
        action_type: &ActionType,
    ) -> Result<Option<Vec<Intent>>, CanisterError> {
        let mut intents: Vec<Intent> = vec![];
        let link_type = link
            .link_type
            .ok_or_else(|| CanisterError::HandleLogicError("link type not found".to_string()))?;

        match (link_type, action_type) {
            (LinkType::SendTip, ActionType::CreateLink) => {
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
                transfer_asset_intent.label = INTENT_LABEL_SEND_TIP_ASSET.to_string();

                // create intent for transfer fee to treasury
                //TODO: get the intent template from config then map the values
                let mut transfer_fee_intent = Intent::default();
                let transfer_fee_data = IntentType::default_transfer_from();
                transfer_fee_intent.r#type = transfer_fee_data;
                transfer_fee_intent.task = IntentTask::TransferWalletToTreasury;
                transfer_fee_intent.id = Uuid::new_v4().to_string();
                transfer_fee_intent.state = IntentState::Created;
                transfer_fee_intent.created_at = ts;
                transfer_fee_intent.label = INTENT_LABEL_LINK_CREATION_FEE.to_string();

                intents.push(transfer_asset_intent);
                intents.push(transfer_fee_intent);
            }
            (LinkType::SendTip, ActionType::Claim) => {
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
                intent.label = INTENT_LABEL_SEND_TIP_ASSET.to_string();

                intents.push(intent);
            }
            (LinkType::SendTip, ActionType::Withdraw) => {
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
                intent.label = INTENT_LABEL_SEND_TIP_ASSET.to_string();

                intents.push(intent);
            }
            (LinkType::SendAirdrop, ActionType::CreateLink) => {
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
                transfer_asset_intent.label = INTENT_LABEL_SEND_AIRDROP_ASSET.to_string();
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
                transfer_fee_intent.label = INTENT_LABEL_LINK_CREATION_FEE.to_string();
                // adding dependency

                intents.push(transfer_asset_intent);
                intents.push(transfer_fee_intent);
            }
            (LinkType::SendAirdrop, ActionType::Claim) => {
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
                intent.label = INTENT_LABEL_SEND_AIRDROP_ASSET.to_string();

                intents.push(intent);
            }

            (LinkType::SendTokenBasket, ActionType::CreateLink) => {
                let asset_info = link.asset_info.clone().ok_or_else(|| {
                    CanisterError::HandleLogicError("Asset info not found".to_string())
                })?;
                let ts = self.ic_env.time();

                // create intents for each asset in asset_info

                for asset in asset_info.iter() {
                    if !asset
                        .label
                        .starts_with(INTENT_LABEL_SEND_TOKEN_BASKET_ASSET)
                    {
                        return Err(CanisterError::HandleLogicError(
                            "Asset label not match".to_string(),
                        ));
                    }
                    // Create intent for transfer asset to link
                    let mut transfer_asset_intent = Intent::default();
                    let transfer_data = IntentType::default_transfer();
                    transfer_asset_intent.r#type = transfer_data;
                    transfer_asset_intent.task = IntentTask::TransferWalletToLink;
                    transfer_asset_intent.id = Uuid::new_v4().to_string();
                    transfer_asset_intent.state = IntentState::Created;
                    transfer_asset_intent.created_at = ts;
                    // eg: SEND_TOKEN_BASKET_ASSET_xxx-xxx-xxx
                    transfer_asset_intent.label =
                        INTENT_LABEL_SEND_TOKEN_BASKET_ASSET.to_string() + "_" + &asset.address;

                    intents.push(transfer_asset_intent);
                }

                // Create intent for transfer fee to treasury
                let mut transfer_fee_intent = Intent::default();
                let transfer_fee_data = IntentType::default_transfer_from();
                transfer_fee_intent.r#type = transfer_fee_data;
                transfer_fee_intent.task = IntentTask::TransferWalletToTreasury;
                transfer_fee_intent.id = Uuid::new_v4().to_string();
                transfer_fee_intent.state = IntentState::Created;
                transfer_fee_intent.created_at = ts;
                transfer_fee_intent.label = INTENT_LABEL_LINK_CREATION_FEE.to_string();

                intents.push(transfer_fee_intent);
            }

            (LinkType::SendTokenBasket, ActionType::Claim) => {
                let asset_info = link.asset_info.clone().ok_or_else(|| {
                    CanisterError::HandleLogicError("Asset info not found".to_string())
                })?;
                let ts = self.ic_env.time();

                // create intents for each asset in asset_info
                for asset in asset_info.iter() {
                    // Create intent for transfer asset to link
                    let mut transfer_asset_intent = Intent::default();
                    let transfer_data = IntentType::default_transfer();
                    transfer_asset_intent.r#type = transfer_data;
                    transfer_asset_intent.task = IntentTask::TransferLinkToWallet;
                    transfer_asset_intent.id = Uuid::new_v4().to_string();
                    transfer_asset_intent.state = IntentState::Created;
                    transfer_asset_intent.created_at = ts;
                    transfer_asset_intent.label =
                        INTENT_LABEL_SEND_TIP_ASSET.to_string() + "_" + &asset.address;

                    intents.push(transfer_asset_intent);
                }
            }
            (LinkType::ReceivePayment, ActionType::CreateLink) => {
                let ts = self.ic_env.time();

                // Create intent for transfer fee to treasury
                let mut transfer_fee_intent = Intent::default();
                let transfer_fee_data = IntentType::default_transfer_from();
                transfer_fee_intent.r#type = transfer_fee_data;
                transfer_fee_intent.task = IntentTask::TransferWalletToTreasury;
                transfer_fee_intent.id = Uuid::new_v4().to_string();
                transfer_fee_intent.state = IntentState::Created;
                transfer_fee_intent.created_at = ts;
                transfer_fee_intent.label = INTENT_LABEL_LINK_CREATION_FEE.to_string();

                intents.push(transfer_fee_intent);
            }
            // ! should we rename to ActionType = Use
            (LinkType::ReceivePayment, ActionType::Claim) => {
                let ts = self.ic_env.time();
                let mut intent = Intent::default();
                let transfer_data = IntentType::default_transfer();
                intent.r#type = transfer_data;
                intent.task = IntentTask::TransferPayment;
                intent.id = Uuid::new_v4().to_string();
                intent.state = IntentState::Created;
                intent.created_at = ts;
                // same label with transfer asset to link
                intent.label = INTENT_LABEL_RECEIVE_PAYMENT_ASSET.to_string();

                intents.push(intent);
            }
            _ => return Ok(None),
        }
        return Ok(Some(intents));
    }

    pub fn assemble_intents(
        &self,
        link_id: &str,
        action_type: &ActionType,
        user_wallet: &Principal,
    ) -> Result<Vec<Intent>, CanisterError> {
        let link = self.get_link_by_id(link_id.to_string())?;

        let temp_intents = self.look_up_intent(&link, action_type)?;

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
                        error!("label {:#?}", intent.label);
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
        //
        // !Start of user state machine
        //
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
        // !End of state machine logic

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

        // Early return if not a successful claim on a TipLink
        if action.state != ActionState::Success {
            return Ok(false);
        }

        // At this point we know we have a successful claim on a TipLink
        // Update link's properties here
        let mut updated_link = link.clone();

        // update tip link's total_claim
        if link.link_type == Some(LinkType::SendTip) && action.r#type == ActionType::Claim {
            // Update asset info to track the claim
            if let Some(mut asset_info) = updated_link.asset_info.clone() {
                for asset in asset_info.iter_mut() {
                    // Initialize claim_count to 1 or increment it if it already exists
                    asset.claim_count = Some(asset.claim_count.unwrap_or(0) + 1);
                }
                updated_link.asset_info = Some(asset_info);
            }
        } else if link.link_type == Some(LinkType::SendAirdrop)
            && action.r#type == ActionType::Claim
        {
            // Update asset info to track the claim
            if let Some(mut asset_info) = updated_link.asset_info.clone() {
                for asset in asset_info.iter_mut() {
                    // Initialize claim_count to 1 or increment it if it already exists
                    asset.claim_count = Some(asset.claim_count.unwrap_or(0) + 1);
                }
                updated_link.asset_info = Some(asset_info);
            }
        }

        // Save the updated link
        self.link_repository.update(updated_link);

        // Return true to indicate that we updated the link
        Ok(true)
    }

    pub fn link_type_add_asset_validate(&self, link: &Link, asset_infos: &Vec<AssetInfo>) -> bool {
        if link.link_type == Some(LinkType::SendTip) {
            if asset_infos.len() == 1
                && asset_infos[0].amount_per_claim.is_some()
                && asset_infos[0].amount_per_claim.unwrap() == asset_infos[0].total_amount
            {
                return true;
            } else {
                return false;
            }
        } else if link.link_type == Some(LinkType::SendAirdrop) {
            if asset_infos.len() == 1
                && asset_infos[0].amount_per_claim.is_some()
                && asset_infos[0].amount_per_claim.unwrap() <= asset_infos[0].total_amount
            {
                return true;
            } else {
                return false;
            }
        } else if link.link_type == Some(LinkType::SendTokenBasket) {
            if asset_infos.len() >= 1 {
                for asset in asset_infos.iter() {
                    if asset.amount_per_claim.is_some()
                        && asset.amount_per_claim.unwrap() == asset.total_amount
                    {
                        return true;
                    }
                }

                return false;
            } else {
                return false;
            }
        } else if link.link_type == Some(LinkType::ReceivePayment) {
            info!("[link_type_add_asset_validate] link type: {:#?}", link);
            // validate asset info
            if asset_infos.len() == 1 && asset_infos[0].payment_amount.is_some() {
                return true;
            } else {
                return false;
            }
        } else {
            // link type is not supported
            return false;
        }
    }

    // this method use for withdraw
    // return true if any balance > 0 or gas fee
    // return false if all balance == 0
    pub async fn check_link_asset_left(&self, link: &Link) -> Result<bool, CanisterError> {
        let asset_info = link
            .asset_info
            .clone()
            .ok_or_else(|| CanisterError::HandleLogicError("Asset info not found".to_string()))
            .unwrap();

        if asset_info.len() == 0 {
            return Err(CanisterError::HandleLogicError(
                "Asset info not found".to_string(),
            ));
        }

        for asset in asset_info.iter() {
            let token_pid = Principal::from_text(asset.address.as_str()).map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Error converting token address to principal: {:?}",
                    e
                ))
            })?;

            let account = Account {
                owner: self.ic_env.id(),
                subaccount: Some(to_subaccount(&link.id.clone())),
            };

            let balance = self
                .icrc_service
                .balance_of(token_pid, account)
                .await
                .map_err(|e| e)?;

            if balance > 0 {
                return Ok(true);
            }
        }

        return Ok(false);
    }

    pub fn prefetch_template(
        &self,
        params: &LinkDetailUpdateInput,
    ) -> Result<(Template, LinkType), CanisterError> {
        let template_str = params
            .template
            .clone()
            .ok_or_else(|| CanisterError::ValidationErrors("Template is required".to_string()))?;

        let link_type_str = params
            .link_type
            .clone()
            .ok_or_else(|| CanisterError::ValidationErrors("Link type is required".to_string()))?;

        let template = Template::from_str(template_str.as_str())
            .map_err(|_| CanisterError::ValidationErrors("Invalid template".to_string()))?;

        let link_type = LinkType::from_str(link_type_str.as_str())
            .map_err(|_| CanisterError::ValidationErrors("Invalid link type".to_string()))?;

        Ok((template, link_type))
    }

    pub fn prefetch_asset_info(
        &self,
        params: &LinkDetailUpdateInput,
        goto: &LinkStateMachineGoto,
    ) -> Result<Vec<AssetInfo>, CanisterError> {
        // skip if goto is Back
        if goto == &LinkStateMachineGoto::Back {
            return Ok(vec![]);
        }

        let asset_info_input = params
            .asset_info
            .clone()
            .ok_or_else(|| CanisterError::ValidationErrors("Asset info is required".to_string()))?;

        Ok(asset_info_input
            .iter()
            .map(|asset| asset.to_model())
            .collect())
    }

    pub fn prefetch_create_action(&self, link: &Link) -> Result<Option<Action>, CanisterError> {
        let link_creation_action: Vec<LinkAction> = self.link_action_repository.get_by_prefix(
            link.id.clone(),
            ActionType::CreateLink.to_string(),
            link.creator.clone(),
        );

        if link_creation_action.is_empty() {
            return Ok(None);
        }

        let create_action = self
            .action_repository
            .get(link_creation_action[0].action_id.clone());

        return Ok(create_action);
    }

    pub fn prefetch_withdraw_action(&self, link: &Link) -> Result<Option<Action>, CanisterError> {
        let link_withdraw_action: Vec<LinkAction> = self.link_action_repository.get_by_prefix(
            link.id.clone(),
            ActionType::Withdraw.to_string(),
            link.creator.clone(),
        );

        if link_withdraw_action.is_empty() {
            return Ok(None);
        }

        let withdraw_action = self
            .action_repository
            .get(link_withdraw_action[0].action_id.clone());

        return Ok(withdraw_action);
    }

    // this method checking non-whitelist props are changed or not
    // if changed, return true
    // if not changed, return false
    pub fn is_props_changed(
        &self,
        whitelist_props: Vec<String>,
        params: &LinkDetailUpdateInput,
        link: &Link,
    ) -> bool {
        let props_list = vec![
            "title".to_string(),
            "description".to_string(),
            "asset_info".to_string(),
            "template".to_string(),
            "link_type".to_string(),
            "link_image_url".to_string(),
            "nft_image".to_string(),
        ];

        let check_props = props_list
            .iter()
            .filter(|prop| !whitelist_props.contains(prop))
            .collect::<Vec<_>>();

        info!("[is_props_changed] check_props: {:#?}", check_props);

        for prop in check_props.iter() {
            match prop.as_str() {
                "title" => {
                    info!("[is_props_changed] link title: {:#?}", link.title);
                    info!("[is_props_changed] params title: {:#?}", params.title);

                    if params.title.is_none() {
                        return false;
                    }

                    if params.title != link.title {
                        info!("[is_props_changed] link title not match");
                        return true;
                    }
                }
                "description" => {
                    info!(
                        "[is_props_changed] link description: {:#?}",
                        link.description
                    );
                    info!(
                        "[is_props_changed] params description: {:#?}",
                        params.description
                    );

                    if params.description.is_none() {
                        return false;
                    }

                    if params.description != link.description {
                        info!("[is_props_changed] link description not match");
                        return true;
                    }
                }
                "link_image_url" => {
                    info!(
                        "[is_props_changed] link_image_url: {:#?}",
                        link.get_metadata("link_image_url")
                    );
                    info!(
                        "[is_props_changed] params link_image_url: {:#?}",
                        params.link_image_url
                    );

                    if params.link_image_url.is_none() {
                        return false;
                    }

                    if params.link_image_url != link.get_metadata("link_image_url") {
                        info!("[is_props_changed] link_image_url not match");
                        return true;
                    }
                }
                "nft_image" => {
                    info!(
                        "[is_props_changed] nft_image: {:#?}",
                        link.get_metadata("nft_image")
                    );
                    info!(
                        "[is_props_changed] params nft_image: {:#?}",
                        params.nft_image
                    );

                    if params.nft_image.is_none() {
                        return false;
                    }

                    if params.nft_image != link.get_metadata("nft_image") {
                        info!("[is_props_changed] nft_image not match");
                        return true;
                    }
                }
                "link_type" => {
                    info!("[is_props_changed] link_type: {:#?}", link.link_type);
                    info!(
                        "[is_props_changed] params link_type: {:#?}",
                        params.link_type
                    );
                    let link_link_type_str = link.link_type.as_ref().map(|lt| lt.to_string());

                    if params.link_type.is_none() {
                        return false;
                    }
                    if params.link_type != link_link_type_str {
                        info!("[is_props_changed] link_type not match");
                        return true;
                    }
                }
                "template" => {
                    info!("[is_props_changed] link template: {:#?}", link.template);
                    info!("[is_props_changed] params template: {:#?}", params.template);
                    let link_template_str = link.template.as_ref().map(|t| t.to_string());
                    if params.template.is_none() {
                        return false;
                    }
                    if params.template != link_template_str {
                        info!("[is_props_changed] link template not match");
                        return true;
                    }
                }
                "asset_info" => {
                    info!("[is_props_changed] link asset_info: {:#?}", link.asset_info);
                    info!(
                        "[is_props_changed] params asset_info: {:#?}",
                        params.asset_info
                    );

                    match (&link.asset_info, &params.asset_info) {
                        (_, None) => {
                            return false;
                        }
                        (Some(link_asset_info), Some(params_asset_info)) => {
                            // Compare IDs in both lists
                            let link_ids: Vec<_> =
                                link_asset_info.iter().map(|asset| &asset.label).collect();
                            let params_ids: Vec<_> =
                                params_asset_info.iter().map(|asset| &asset.label).collect();

                            // asset info changed
                            if link_ids.len() != params_ids.len()
                                || !link_ids.iter().all(|id| params_ids.contains(id))
                            {
                                info!("[is_props_changed] asset_info IDs do not match");
                                return true;
                            }

                            // Compare updated data
                            for param_asset in params_asset_info {
                                if let Some(link_asset) = link_asset_info
                                    .iter()
                                    .find(|asset| asset.label == param_asset.label)
                                {
                                    if param_asset.is_changed(link_asset) {
                                        return true;
                                    }
                                } else {
                                    return true;
                                }
                            }
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        }

        false
    }

    pub async fn handle_link_state_transition(
        &self,
        link_id: &str,
        action: String,
        params: Option<LinkDetailUpdateInput>,
    ) -> Result<Link, CanisterError> {
        let mut link = self.get_link_by_id(link_id.to_string())?;

        let link_state_goto = LinkStateMachineGoto::from_string(&action)
            .map_err(|e| CanisterError::ValidationErrors(e))?;

        // if params is None, all params are None
        // some goto not required params like Back
        let params = params.unwrap_or(LinkDetailUpdateInput {
            title: None,
            description: None,
            link_image_url: None,
            nft_image: None,
            asset_info: None,
            template: None,
            link_type: None,
        });

        // !Start of link state machine
        if link.state == LinkState::ChooseLinkType {
            let (template, link_type) = self.prefetch_template(&params)?;

            if self.is_props_changed(
                vec![
                    "title".to_string(),
                    "template".to_string(),
                    "link_type".to_string(),
                ],
                &params,
                &link,
            ) {
                return Err(CanisterError::ValidationErrors(
                    "Link properties are not allowed to change".to_string(),
                ));
            }

            if link_state_goto == LinkStateMachineGoto::Continue {
                link.title = params.title.clone();
                link.template = Some(template);
                link.link_type = Some(link_type);
                link.state = LinkState::AddAssets;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            } else if link_state_goto == LinkStateMachineGoto::Back {
                link.title = params.title.clone();
                link.template = Some(template);
                link.link_type = Some(link_type);
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            } else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for ChooseLinkType".to_string(),
                ));
            }
        } else if link.state == LinkState::AddAssets {
            // prefetch 2 method
            let asset_info = self.prefetch_asset_info(&params, &link_state_goto)?;

            if self.is_props_changed(vec!["asset_info".to_string()], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "Link properties are not allowed to change".to_string(),
                ));
            }

            info!("[handle_link_state_transition] link: {:#?}", link);
            info!(
                "[handle_link_state_transition] asset_info: {:#?}",
                asset_info
            );
            info!("[handle_link_state_transition] params: {:#?}", params);

            if link_state_goto == LinkStateMachineGoto::Continue {
                if !self.link_type_add_asset_validate(&link, &asset_info) {
                    return Err(CanisterError::ValidationErrors(
                        "Link type add asset validate failed".to_string(),
                    ));
                }

                link.asset_info = Some(asset_info);
                link.state = LinkState::CreateLink;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            } else if link_state_goto == LinkStateMachineGoto::Back {
                link.state = LinkState::ChooseLinkType;
                link.asset_info = Some(asset_info);
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            } else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for AddAssets".to_string(),
                ));
            }
        } else if link.state == LinkState::CreateLink {
            // prefetch 3 method
            let create_action = self.prefetch_create_action(&link)?;

            if self.is_props_changed(vec![], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "Link properties are not allowed to change".to_string(),
                ));
            }

            if link_state_goto == LinkStateMachineGoto::Continue {
                if create_action.is_none() {
                    return Err(CanisterError::ValidationErrors(
                        "Create action not found".to_string(),
                    ));
                } else if create_action.unwrap().state == ActionState::Success {
                    link.state = LinkState::Active;
                    self.link_repository.update(link.clone());
                    return Ok(link.clone());
                } else {
                    return Err(CanisterError::ValidationErrors(
                        "Create action not success".to_string(),
                    ));
                }
            } else if link_state_goto == LinkStateMachineGoto::Back {
                if create_action.is_none() {
                    link.state = LinkState::AddAssets;
                    self.link_repository.update(link.clone());
                    return Ok(link.clone());
                } else {
                    return Err(CanisterError::ValidationErrors(
                        "The create action is exist".to_string(),
                    ));
                }
            } else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for AddAssets".to_string(),
                ));
            }
        } else if link.state == LinkState::Active {
            if self.is_props_changed(vec![], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "Link properties are not allowed to change".to_string(),
                ));
            }

            if link_state_goto == LinkStateMachineGoto::Continue {
                if self.check_link_asset_left(&link).await? {
                    link.state = LinkState::Inactive;
                } else {
                    link.state = LinkState::InactiveEnded;
                }
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            } else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for Active".to_string(),
                ));
            }
        } else if link.state == LinkState::Inactive {
            if self.is_props_changed(vec![], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "Link properties are not allowed to change".to_string(),
                ));
            }

            let withdraw_action = self.prefetch_withdraw_action(&link)?;
            if link_state_goto == LinkStateMachineGoto::Continue {
                if !self.check_link_asset_left(&link).await?
                    && withdraw_action.is_some()
                    && withdraw_action.unwrap().state == ActionState::Success
                {
                    link.state = LinkState::InactiveEnded;
                    self.link_repository.update(link.clone());
                    return Ok(link.clone());
                } else {
                    return Err(CanisterError::ValidationErrors(
                        "Withdraw action not success".to_string(),
                    ));
                }
            } else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for Inactive".to_string(),
                ));
            }
        } else if link.state == LinkState::InactiveEnded {
            return Err(CanisterError::ValidationErrors("Link is ended".to_string()));
        } else {
            return Err(CanisterError::ValidationErrors("Invalid state".to_string()));
        }
        // !End of link state machine
    }

    /// Create a new link
    pub fn create_new(
        &self,
        creator: String,
        input: crate::core::link::types::CreateLinkInput,
    ) -> Result<String, String> {
        let user_wallet = self
            .user_wallet_repository
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
        let user_wallet = self
            .user_wallet_repository
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
        let user_wallet = match self.user_wallet_repository.get(&caller) {
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
