use std::str::FromStr;

use cashier_types::{ActionState, ActionType, LinkType};
use ic_cdk::{query, update};
use uuid::Uuid;

use crate::{
    core::{
        action::types::{ActionDto, ProcessActionInput},
        guard::is_not_anonymous,
        GetLinkOptions, GetLinkResp, LinkDto, PaginateResult, UpdateLinkInput,
    },
    error,
    services::{
        self,
        link::{create_new, is_link_creator, update::handle_update_link, v2::LinkService},
        transaction_manager::{TransactionManagerService, UpdateActionArgs},
        user::v2::UserService,
    },
    types::{api::PaginateInput, error::CanisterError, temp_action::TemporaryAction},
    utils::runtime::{IcEnvironment, RealIcEnvironment},
};

use super::types::CreateLinkInput;

#[query(guard = "is_not_anonymous")]
async fn get_links(input: Option<PaginateInput>) -> Result<PaginateResult<LinkDto>, String> {
    let caller = ic_cdk::api::caller();

    match services::link::get_links_by_principal(caller.to_text(), input.unwrap_or_default()) {
        Ok(links) => return Ok(links.map(|link| return LinkDto::from(link))),
        Err(e) => {
            return {
                error!("Failed to get links: {}", e);
                Err(e)
            }
        }
    }
}

#[query]
async fn get_link(id: String, options: Option<GetLinkOptions>) -> Result<GetLinkResp, String> {
    let caller = ic_cdk::api::caller();

    let is_valid_creator = is_link_creator(caller.to_text(), &id);

    let action_type: Option<ActionType> = match options {
        Some(options) => match ActionType::from_str(&options.action_type) {
            Ok(link_type) => match link_type {
                ActionType::CreateLink => Some(link_type),
                ActionType::Withdraw => Some(link_type),
                ActionType::Claim => return Err("Invalid action type".to_string()),
            },
            Err(_) => {
                return Err("Invalid action type".to_string());
            }
        },
        None => None,
    };

    let link = services::link::get_link_by_id(id.clone())?;

    // if not link creator doesn't allow get create link and withdraw action
    let action = match action_type {
        Some(action_type) => match action_type {
            ActionType::CreateLink => {
                if is_valid_creator {
                    Some(action_type)
                } else {
                    None
                }
            }
            ActionType::Withdraw => {
                if is_valid_creator {
                    Some(action_type)
                } else {
                    None
                }
            }
            ActionType::Claim => None,
        },
        None => None,
    };

    let action = match action {
        Some(action_type) => services::link::get_link_action(id, action_type.to_string()),
        None => None,
    };

    let action_dto = match action {
        Some(action) => {
            let intents = services::action::get_intents_by_action_id(action.id.clone());
            Some(ActionDto::from(action, intents))
        }
        None => None,
    };

    return Ok(GetLinkResp {
        link: LinkDto::from(link),
        action: action_dto,
    });
}

#[update(guard = "is_not_anonymous")]
async fn create_link(input: CreateLinkInput) -> Result<String, CanisterError> {
    let creator = ic_cdk::api::caller();

    let id = create_new(creator.to_text(), input);
    match id {
        Ok(id) => Ok(id),
        Err(e) => {
            error!("Failed to create link: {}", e);
            Err(CanisterError::HandleApiError(e))
        }
    }
}

#[update(guard = "is_not_anonymous")]
async fn update_link(input: UpdateLinkInput) -> Result<LinkDto, CanisterError> {
    match input.validate() {
        Ok(_) => (),
        Err(e) => return Err(CanisterError::HandleApiError(e)),
    }

    let creator = ic_cdk::api::caller();

    // get link type
    let link = match services::link::get_link_by_id(input.id.clone()) {
        Ok(rsp) => rsp,
        Err(e) => {
            error!("Failed to get link: {:#?}", e);
            return Err(CanisterError::HandleApiError("Link not found".to_string()));
        }
    };

    match is_link_creator(creator.to_text(), &input.id) {
        true => (),
        false => {
            return Err(CanisterError::HandleApiError(
                "Caller are not the creator of this link".to_string(),
            ))
        }
    }

    let link_type = link.link_type.clone();

    if link_type.is_none() {
        return Err(CanisterError::HandleApiError(
            "Link type is missing".to_string(),
        ));
    }

    let link_type_str = link_type.unwrap();
    match link_type_str {
        LinkType::NftCreateAndAirdrop => match handle_update_link(input, link).await {
            Ok(l) => Ok(LinkDto::from(l)),
            Err(e) => {
                error!("Failed to update link: {:#?}", e);
                Err(e)
            }
        },
        LinkType::TipLink => match handle_update_link(input, link).await {
            Ok(l) => Ok(LinkDto::from(l)),
            Err(e) => {
                error!("Failed to update link: {:#?}", e);
                Err(e)
            }
        },
        // _ => Err(CanisterError::HandleApiError(
        //     "Invalid link type".to_string(),
        // )),
    }
}

#[update(guard = "is_not_anonymous")]
pub async fn process_action(input: ProcessActionInput) -> Result<ActionDto, CanisterError> {
    let api: LinkApi<RealIcEnvironment> = LinkApi::get_instance();
    api.process_action(input).await
}

pub struct LinkApi<E: IcEnvironment + Clone> {
    link_service: LinkService<E>,
    user_service: UserService,
    tx_manager_service: TransactionManagerService<E>,
    ic_env: E,
}

impl<E: IcEnvironment + Clone> LinkApi<E> {
    pub fn get_instance() -> Self {
        Self {
            link_service: LinkService::get_instance(),
            user_service: UserService::get_instance(),
            tx_manager_service: TransactionManagerService::get_instance(),
            ic_env: E::new(),
        }
    }

    pub fn new(
        link_service: LinkService<E>,
        user_service: UserService,
        tx_manager_service: TransactionManagerService<E>,
        ic_env: E,
    ) -> Self {
        Self {
            link_service,
            user_service,
            tx_manager_service,
            ic_env,
        }
    }

    pub async fn process_action(
        &self,
        input: ProcessActionInput,
    ) -> Result<ActionDto, CanisterError> {
        let caller = self.ic_env.caller();

        // get user_id and action_id
        let user_id = self.user_service.get_user_id_by_wallet(&caller);

        // basic validations
        if user_id.is_none() {
            return Err(CanisterError::ValidationErrors(
                "User not found".to_string(),
            ));
        }

        let action = self
            .link_service
            .get_action_of_link(&input.link_id, &input.action_type);

        if action.is_none() {
            let action_type = ActionType::from_str(&input.action_type)
                .map_err(|_| CanisterError::ValidationErrors(format!("Invalid action type ")))?;

            // validate create action
            self.link_service.link_validate_user_create_action(
                &input.link_id,
                &action_type,
                &user_id.as_ref().unwrap(),
            )?;

            // validate user balance
            self.link_service
                .link_validate_balance_with_asset_info(&input.link_id, &caller)
                .await?;

            //create temp action
            // fill in link_id info
            // fill in action_type info
            let mut temp_action = TemporaryAction {
                id: Uuid::new_v4().to_string(),
                r#type: action_type,
                state: ActionState::Created,
                creator: user_id.as_ref().unwrap().to_string(),
                link_id: input.link_id.clone(),
                intents: vec![],
            };

            // fill the intent info
            let intents = self
                .link_service
                .link_assemble_intents(&temp_action.link_id, &temp_action.r#type)
                .map_err(|e| {
                    CanisterError::HandleLogicError(format!("Failed to assemble intents: {}", e))
                })?;
            temp_action.intents = intents;

            // create real action
            let res = self.tx_manager_service.tx_man_create_action(&temp_action)?;

            Ok(res)
        } else {
            // validate action
            self.link_service
                .link_validate_user_update_action(&action.as_ref().unwrap(), &user_id.unwrap())?;

            // execute action
            self.tx_manager_service
                .update_action(UpdateActionArgs {
                    action_id: action.unwrap().id,
                    link_id: input.link_id,
                    execute_wallet_tx: false,
                })
                .await
        }
    }
}
