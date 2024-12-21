use ic_cdk::update;

use crate::{
    core::{guard::is_not_anonymous, CanisterError, Intent, UpdateIntentInput},
    services,
};

use super::types::CreateIntentInput;

#[update(guard = "is_not_anonymous")]
pub async fn create_intent(input: CreateIntentInput) -> Result<Intent, CanisterError> {
    // inside already check caller is creator
    services::transaction::create::create(input).await
}

#[update(guard = "is_not_anonymous")]
pub async fn update_intent(input: UpdateIntentInput) {}
