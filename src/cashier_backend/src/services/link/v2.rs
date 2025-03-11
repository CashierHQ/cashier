use cashier_types::{
    Action, ActionType, Asset, Chain, Intent, IntentState, IntentTask, IntentType, Link, LinkType,
    Wallet,
};
use icrc_ledger_types::icrc1::account::Account;
use uuid::Uuid;

use crate::{
    constant::{
        ICP_CANISTER_ID, INTENT_LABEL_LINK_TO_WALLET, INTENT_LABEL_WALLET_TO_LINK,
        INTENT_LABEL_WALLET_TO_TREASURY,
    },
    repositories::{self, action::ActionRepository, link_action::LinkActionRepository},
    services::transaction_manager::fee::Fee,
    types::{error::CanisterError, temp_action::TemporaryAction},
    utils::{helper::to_subaccount, runtime::IcEnvironment},
};

pub struct LinkService<E: IcEnvironment + Clone> {
    // LinkService fields go here
    link_repository: repositories::link::LinkRepository,
    link_action_repository: LinkActionRepository,
    action_repository: ActionRepository,
    ic_env: E,
}

impl<E: IcEnvironment + Clone> LinkService<E> {
    pub fn get_instance() -> Self {
        Self {
            link_repository: repositories::link::LinkRepository::new(),
            link_action_repository: LinkActionRepository::new(),
            action_repository: ActionRepository::new(),
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
                intent.label = INTENT_LABEL_LINK_TO_WALLET.to_string();

                intents.push(intent);
            }
            _ => return None,
        }
        return Some(intents);
    }

    pub fn link_assemble_intents(
        &self,
        // todo change to link_id, and action type
        temp_action: &TemporaryAction,
    ) -> Result<Vec<Intent>, CanisterError> {
        let link = self.get_link_by_id(temp_action.link_id.clone())?;

        let temp_intents = self.look_up_intent(&link.link_type.unwrap(), &temp_action.r#type);

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
                        CanisterError::HandleLogicError("Asset not found".to_string())
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
                    let asset_info = link.get_asset_by_label(&intent.label).ok_or_else(|| {
                        CanisterError::HandleLogicError("Asset not found".to_string())
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
                _ => {}
            }
        }

        Ok(intents)
    }

    // TODO: add user id or wallet address as param
    pub fn get_action_of_link(&self, link_id: &str, action_type: &str) -> Option<Action> {
        let link_actions = self
            .link_action_repository
            .get_by_link_action(link_id.to_string(), action_type.to_string());

        if link_actions.is_empty() {
            return None;
        }

        let action = self
            .action_repository
            .get(link_actions[0].action_id.clone());

        return action;
    }

    pub fn validate_action(&self, action: &Action, user_id: &str) -> Result<(), CanisterError> {
        //validate user_id
        match action.r#type.clone() {
            ActionType::CreateLink => {
                let link = self.get_link_by_id(action.link_id.clone())?;
                if !(action.creator == user_id || link.creator == user_id) {
                    return Err(CanisterError::ValidationErrors(
                        "User is not the creator of the action".to_string(),
                    ));
                }
            }
            ActionType::Withdraw => {
                let link = self.get_link_by_id(action.link_id.clone())?;
                if !(action.creator == user_id || link.creator == user_id) {
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

    pub fn validate_asset_left(&self, link_id: &str) -> () {}
}
