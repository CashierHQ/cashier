use cashier_types::{Action, ActionType, Intent, Link, LinkType};
use serde::{Deserialize, Serialize};

pub mod ic_adapter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConvertToIntentInput {
    pub action: Action,
    pub link: Link,
}

pub trait ActionAdapter {
    fn convert_to_intent(&self, input: ConvertToIntentInput) -> Result<Vec<Intent>, String>;
}

pub trait ActionLinkAdapter {
    fn handle_action_link(
        &self,
        link_type: LinkType,
        action: ActionType,
    ) -> Result<Vec<Intent>, String>;
}
