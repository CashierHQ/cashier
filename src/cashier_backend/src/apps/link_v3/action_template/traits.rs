use cashier_backend_types::{
    error::CanisterError,
    repository::{action::v1::ActionType, link::v1::LinkType},
};
use cashier_shared::types::Action as ActionShared;

pub trait TemplateLoader {
    fn load_action_template(
        &self,
        link_type: LinkType,
        action_type: ActionType,
    ) -> Result<ActionShared, CanisterError>;
}
