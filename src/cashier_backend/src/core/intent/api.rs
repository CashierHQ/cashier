use ic_cdk::{query, update};

use crate::{
    core::{
        guard::is_not_anonymous, CanisterError, CreateIntentConsent, CreateIntentConsentResponse,
        GetConsentMessageInput, UpdateIntentInput,
    },
    services,
};

use super::types::CreateIntentInput;

#[update(guard = "is_not_anonymous")]
pub async fn create_intent(
    input: CreateIntentInput,
) -> Result<CreateIntentConsentResponse, CanisterError> {
    // inside already check caller is creator
    services::transaction::create::create_create_link_intent(input).await
}

#[update(guard = "is_not_anonymous")]
pub async fn update_intent(input: UpdateIntentInput) {}

#[query(guard = "is_not_anonymous")]
pub async fn get_consent_message(
    input: GetConsentMessageInput,
) -> Result<CreateIntentConsent, CanisterError> {
    services::transaction::consent_message::get_consent_message(input)
}
