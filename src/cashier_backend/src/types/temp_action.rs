use cashier_types::{Action, ActionState, ActionType, Intent};

#[derive(Debug, Clone)]
pub struct TemporaryAction {
    pub id: String,
    pub r#type: ActionType,
    pub state: ActionState,
    pub creator: String,
    pub link_id: String,
    pub intents: Vec<Intent>,
}

impl TemporaryAction {
    pub fn as_action(&self) -> Action {
        Action {
            id: self.id.clone(),
            r#type: self.r#type.clone(),
            state: self.state.clone(),
            creator: self.creator.clone(),
            link_id: self.link_id.clone(),
        }
    }
}
