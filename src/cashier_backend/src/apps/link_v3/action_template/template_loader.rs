use crate::apps::link_v3::action_template::traits::TemplateLoader;
use cashier_backend_types::{
    error::CanisterError,
    repository::{action::v1::ActionType, link::v1::LinkType},
};
use cashier_shared::types::Action as ActionShared;

pub struct JsonTemplateLoader {
    pub link_type: LinkType,
    pub json_templates: String,
}

impl JsonTemplateLoader {
    pub fn new(link_type: LinkType, json_templates: String) -> Self {
        Self {
            link_type,
            json_templates,
        }
    }
}

impl TemplateLoader for JsonTemplateLoader {
    fn load_action_template(
        &self,
        link_type: LinkType,
        action_type: ActionType,
    ) -> Result<ActionShared, CanisterError> {
        if self.link_type != link_type {
            return Err(CanisterError::ValidationErrors(format!(
                "Link type {} invalid",
                link_type
            )));
        }

        let actions: Vec<ActionShared> =
            serde_json::from_str(&self.json_templates).map_err(|e| {
                CanisterError::HandleLogicError(format!(
                    "Decoding action template failed for action {} of link {} with error: {}",
                    action_type, link_type, e
                ))
            })?;

        let action = actions
            .into_iter()
            .find(|action| ActionType::from(action.action_type.clone()) == action_type);

        action.ok_or_else(|| {
            CanisterError::NotFound(format!(
                "Action type {} for link type {} not found",
                action_type, link_type
            ))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_should_fail_load_action_template() {
        let json_templates = r#"
        [
            {
                "action_type": "Send",
                "template": "Template for Send action"
            },
            {
                "action_type": "Receive",
                "template": "Template for Receive action"
            }
        ]
        "#;

        let loader = JsonTemplateLoader::new(LinkType::SendTip, json_templates.to_string());

        let result = loader.load_action_template(LinkType::SendTip, ActionType::Send);
        assert!(result.is_ok());
    }
}
