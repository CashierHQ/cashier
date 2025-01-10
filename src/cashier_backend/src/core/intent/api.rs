use ic_cdk::{query, update};

use crate::{
    core::{
        guard::is_not_anonymous, CanisterError, ConfirmIntentInput, CreateIntentConsent,
        CreateIntentConsentResponse, GetConsentMessageInput, IntentResp, UpdateIntentInput,
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
pub async fn confirm_intent(input: ConfirmIntentInput) -> Result<IntentResp, String> {
    services::transaction::confirm::confirm_intent(input).await
}

#[update(guard = "is_not_anonymous")]
pub async fn update_intent(input: UpdateIntentInput) -> Result<IntentResp, String> {
    let caller = ic_cdk::api::caller();

    if !services::transaction::validate::is_intent_creator(caller.to_text(), &input.intent_id)
        .await?
    {
        return Err("User is not the creator of the intent".to_string());
    }

    services::transaction::update::update_transaction_and_roll_up(input)
}

#[query(guard = "is_not_anonymous")]
pub async fn get_consent_message(
    input: GetConsentMessageInput,
) -> Result<CreateIntentConsent, CanisterError> {
    services::transaction::consent_message::get_consent_message(input)
}
