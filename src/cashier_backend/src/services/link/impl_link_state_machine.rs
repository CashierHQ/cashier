use std::str::FromStr;

use async_trait::async_trait;

use cashier_types::{
    action::v1::{Action, ActionState, ActionType},
    asset_info::AssetInfo,
    link::v1::{Link, LinkState, LinkType, Template},
    link_action::v1::LinkAction,
    user_link::v1::UserLink,
};
use uuid::Uuid;

use crate::{
    core::link::types::{CreateLinkInput, LinkDetailUpdateInput, LinkStateMachineGoto},
    error,
    services::link::{
        traits::{LinkStateMachine, LinkValidation},
        service::LinkService,
    },
    types::error::CanisterError,
    utils::runtime::IcEnvironment,
};

#[async_trait(?Send)]
impl<E: IcEnvironment + Clone> LinkStateMachine for LinkService<E> {
    // this method checking non-whitelist props are changed or not
    // if changed, return true
    // if not changed, return false
    fn is_props_changed(
        &self,
        whitelist_props: &[String],
        params: &LinkDetailUpdateInput,
        link: &Link,
    ) -> bool {
        let props_list = [
            "title".to_string(),
            "description".to_string(),
            "asset_info".to_string(),
            "template".to_string(),
            "link_type".to_string(),
            "link_image_url".to_string(),
            "nft_image".to_string(),
            "link_use_action_max_count".to_string(),
        ];

        let check_props = props_list
            .iter()
            .filter(|prop| !whitelist_props.contains(prop))
            .collect::<Vec<_>>();

        for prop in check_props.iter() {
            match prop.as_str() {
                "title" => {
                    if params.title.is_none() {
                        return false;
                    }

                    if params.title != link.title {
                        return true;
                    }
                }
                "description" => {
                    if params.description.is_none() {
                        return false;
                    }

                    if params.description != link.description {
                        return true;
                    }
                }
                "link_image_url" => {
                    if params.link_image_url.is_none() {
                        return false;
                    }

                    if params.link_image_url != link.get_metadata("link_image_url") {
                        return true;
                    }
                }
                "nft_image" => {
                    if params.nft_image.is_none() {
                        return false;
                    }

                    if params.nft_image != link.get_metadata("nft_image") {
                        return true;
                    }
                }
                "link_type" => {
                    let link_link_type_str = link
                        .link_type
                        .as_ref()
                        .map(cashier_types::link::v1::LinkType::to_string);

                    if params.link_type.is_none() {
                        return false;
                    }
                    if params.link_type != link_link_type_str {
                        return true;
                    }
                }
                "template" => {
                    let link_template_str = link
                        .template
                        .as_ref()
                        .map(cashier_types::link::v1::Template::to_string);
                    if params.template.is_none() {
                        return false;
                    }
                    if params.template != link_template_str {
                        return true;
                    }
                }
                "link_use_action_max_count" => {
                    if let Some(max_count) = params.link_use_action_max_count {
                        if max_count != link.link_use_action_max_count {
                            return true;
                        }
                    } else {
                        return false;
                    }
                }
                "asset_info" => {
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

    async fn create_link(
        &self,
        caller: String,
        input: CreateLinkInput,
    ) -> Result<Link, CanisterError> {
        let user_wallet = self
            .user_wallet_repository
            .get(&caller)
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
            template: Some(Template::Central),
            creator: user_id.clone(),
            create_at: ts,
            metadata: None,
            link_use_action_counter: 0,
            link_use_action_max_count: 0,
        };
        let new_user_link = UserLink {
            user_id: user_id.clone(),
            link_id: link_id_str.clone(),
        };

        // Create the initial link and user_link records
        self.link_repository.create(new_link);
        self.user_link_repository.create(new_user_link.clone());

        // First transition: ChooseLinkType -> AddAssets
        // For this transition, we only need title, template, and link_type
        let choose_link_type_params = LinkDetailUpdateInput {
            title: Some(input.title.clone()),
            template: Some(input.template.clone()),
            link_type: Some(input.link_type.clone()),
            description: None,
            link_image_url: None,
            nft_image: None,
            asset_info: None,
            link_use_action_max_count: None,
        };

        let result = self
            .handle_link_state_transition(&link_id_str, "Continue", Some(choose_link_type_params))
            .await;

        if result.is_err() {
            // Clean up on failure
            self.link_repository.delete(&link_id_str);
            self.user_link_repository.delete(new_user_link);
            return Err(CanisterError::HandleLogicError(format!(
                "Create link failed: transition from ChooseLinkType to AddAssets {:?}",
                result.err()
            )));
        }

        // Second transition: AddAssets -> Preview
        // For this transition, we only need asset_info and link_use_action_max_count
        let add_assets_params = LinkDetailUpdateInput {
            title: None,
            template: None,
            link_type: None,
            description: input.description.clone(),
            link_image_url: input.link_image_url.clone(),
            nft_image: input.nft_image.clone(),
            asset_info: Some(input.asset_info.clone()),
            link_use_action_max_count: Some(input.link_use_action_max_count),
        };

        let result = self
            .handle_link_state_transition(&link_id_str, "Continue", Some(add_assets_params))
            .await;

        if result.is_err() {
            // Clean up on failure
            self.link_repository.delete(&link_id_str);
            self.user_link_repository.delete(new_user_link);
            return Err(CanisterError::HandleLogicError(format!(
                "Create link failed: transition from AddAssets to Preview {:?}",
                result.err()
            )));
        }

        // Second transition: Preview -> CreateLink
        let add_assets_params = LinkDetailUpdateInput {
            title: None,
            template: None,
            link_type: None,
            description: None,
            link_image_url: None,
            nft_image: None,
            asset_info: None,
            link_use_action_max_count: None,
        };

        let result = self
            .handle_link_state_transition(&link_id_str, "Continue", Some(add_assets_params))
            .await;

        if result.is_err() {
            // Clean up on failure
            self.link_repository.delete(&link_id_str);
            self.user_link_repository.delete(new_user_link);
            return Err(CanisterError::HandleLogicError(format!(
                "Create link failed: transition from Preview to CreateLink {:?}",
                result.err()
            )));
        }

        // Successfully reached CreateLink state
        result
    }

    async fn handle_link_state_transition(
        &self,
        link_id: &str,
        go_to: &str,
        params: Option<LinkDetailUpdateInput>,
    ) -> Result<Link, CanisterError> {
        let mut link = self.get_link_by_id(link_id)?;

        let link_state_goto =
            LinkStateMachineGoto::from_string(&go_to).map_err(CanisterError::ValidationErrors)?;

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
            link_use_action_max_count: None,
        });

        // !Start of link state machine
        // CHOOSE LINK TYPE
        if link.state == LinkState::ChooseLinkType {
            let (template, link_type) = self.prefetch_template(&params)?;

            if self.is_props_changed(
                &[
                    "title".to_string(),
                    "template".to_string(),
                    "link_type".to_string(),
                ],
                &params,
                &link,
            ) {
                return Err(CanisterError::ValidationErrors(
                    "[ChooseLinkType] Link properties are not allowed to change".to_string(),
                ));
            }

            // ====== Continue Go to =====
            if link_state_goto == LinkStateMachineGoto::Continue {
                link.title = params.title.clone();
                link.template = Some(template);
                link.link_type = Some(link_type);
                link.state = LinkState::AddAssets;
                self.link_repository.update(link.clone());
                Ok(link.clone())

            // ====== Back Go to =====
            } else if link_state_goto == LinkStateMachineGoto::Back {
                link.title = params.title.clone();
                link.template = Some(template);
                link.link_type = Some(link_type);
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ====== invalid state =====
            else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for ChooseLinkType".to_string(),
                ));
            }
        } else if link.state == LinkState::AddAssets {
            let (link_use_action_max_count, asset_info) =
                self.prefetch_params_add_asset(&params)?;

            if self.is_props_changed(
                &[
                    "link_use_action_max_count".to_string(),
                    "asset_info".to_string(),
                ],
                &params,
                &link,
            ) {
                return Err(CanisterError::ValidationErrors(
                    "[AddAssets] Link properties are not allowed to change".to_string(),
                ));
            }

            // ====== Continue Go to =====
            if link_state_goto == LinkStateMachineGoto::Continue {
                if !self.validate_add_asset_with_link_type(
                    &link,
                    &asset_info,
                    &link_use_action_max_count,
                ) {
                    return Err(CanisterError::ValidationErrors(
                        "Link type add asset validate failed".to_string(),
                    ));
                }

                link.asset_info = Some(asset_info);
                link.link_use_action_max_count = link_use_action_max_count;
                link.state = LinkState::Preview;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ===== Back Go to =====
            else if link_state_goto == LinkStateMachineGoto::Back {
                link.state = LinkState::ChooseLinkType;
                link.asset_info = Some(asset_info);
                link.link_use_action_max_count = link_use_action_max_count;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ===== invalid state =====
            else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for AddAssets".to_string(),
                ));
            }
        } else if link.state == LinkState::Preview {
            if self.is_props_changed(&[], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "[Preview] Link properties are not allowed to change".to_string(),
                ));
            }

            // ===== Continue Go to =====
            if link_state_goto == LinkStateMachineGoto::Continue {
                link.state = LinkState::CreateLink;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ===== Back Go to =====
            else if link_state_goto == LinkStateMachineGoto::Back {
                link.state = LinkState::AddAssets;
                self.link_repository.update(link.clone());
                return Ok(link.clone());
            }
            // ===== invalid state =====
            else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for Preview".to_string(),
                ));
            }
        } else if link.state == LinkState::CreateLink {
            let create_action = self.prefetch_create_action(&link)?;

            // ===== Continue Go to =====
            if link_state_goto == LinkStateMachineGoto::Continue {
                let create_action = create_action.ok_or_else(|| {
                    CanisterError::ValidationErrors("Create action not found".to_string())
                })?;

                if create_action.state != ActionState::Success {
                    return Err(CanisterError::ValidationErrors(format!(
                        "Create action not success, current state: {:?}",
                        create_action.state
                    )));
                } else {
                    link.state = LinkState::Active;
                    self.link_repository.update(link.clone());
                    return Ok(link.clone());
                }
            }
            // ===== invalid state =====
            else {
                return Err(CanisterError::ValidationErrors(
                    "State transition failed for CreateLink".to_string(),
                ));
            }
        } else if link.state == LinkState::Active {
            if self.is_props_changed(&[], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "[Active] Link properties are not allowed to change".to_string(),
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
            if self.is_props_changed(&[], &params, &link) {
                return Err(CanisterError::ValidationErrors(
                    "[Inactive] Link properties are not allowed to change".to_string(),
                ));
            }

            let withdraw_action = self.prefetch_withdraw_action(&link)?;
            if link_state_goto == LinkStateMachineGoto::Continue {
                if !self.check_link_asset_left(&link).await? {
                    if let Some(action) = withdraw_action {
                        if action.state == ActionState::Success {
                            link.state = LinkState::InactiveEnded;
                            self.link_repository.update(link.clone());
                            return Ok(link.clone());
                        } else {
                            error!("withdraw_action not success {:#?}", action);
                            return Err(CanisterError::ValidationErrors(
                                "Withdraw action not success".to_string(),
                            ));
                        }
                    } else {
                        error!("withdraw_action is None");
                        return Err(CanisterError::ValidationErrors(
                            "Withdraw action not found".to_string(),
                        ));
                    }
                } else {
                    return Err(CanisterError::ValidationErrors(
                        "Link still has assets left".to_string(),
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

    fn prefetch_template(
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
    fn prefetch_params_add_asset(
        &self,
        params: &LinkDetailUpdateInput,
    ) -> Result<(u64, Vec<AssetInfo>), CanisterError> {
        let link_use_action_max_count = params.link_use_action_max_count.ok_or_else(|| {
            CanisterError::ValidationErrors("Link use action max count is required".to_string())
        })?;

        let asset_info_input = params
            .asset_info
            .clone()
            .ok_or_else(|| CanisterError::ValidationErrors("Asset info is required".to_string()))?;

        Ok((
            link_use_action_max_count,
            asset_info_input
                .iter()
                .map(crate::core::link::types::LinkDetailUpdateAssetInfoInput::to_model)
                .collect(),
        ))
    }

    fn prefetch_create_action(&self, link: &Link) -> Result<Option<Action>, CanisterError> {
        let link_creation_action: Vec<LinkAction> = self.link_action_repository.get_by_prefix(
            &link.id,
            ActionType::CreateLink.to_str(),
            &link.creator,
        );

        if link_creation_action.is_empty() {
            return Ok(None);
        }

        let create_action = self
            .action_repository
            .get(&link_creation_action[0].action_id);

        Ok(create_action)
    }

    fn prefetch_withdraw_action(&self, link: &Link) -> Result<Option<Action>, CanisterError> {
        let link_withdraw_action: Vec<LinkAction> = self.link_action_repository.get_by_prefix(
            &link.id,
            &ActionType::Withdraw.to_string(),
            &link.creator.clone(),
        );

        if link_withdraw_action.is_empty() {
            return Ok(None);
        }

        let withdraw_action = self
            .action_repository
            .get(&link_withdraw_action[0].action_id);

        Ok(withdraw_action)
    }
}
