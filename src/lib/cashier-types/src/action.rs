use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Action {
    pub id: String,
    pub action_type: String,
    pub state: ActionState,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum ActionState {
    Created,
    Processing,
    Success,
    Fail,
}
