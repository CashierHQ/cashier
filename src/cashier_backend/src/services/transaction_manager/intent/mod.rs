use crate::{
    core::intent::types::{CreateIntentConsentResponse, CreateIntentInput},
    types::error::CanisterError,
};

pub trait IntentBuilder {
    fn validate(&self) -> Result<(), String>;
    fn is_exist(&self) -> bool;
    fn create(
        &self,
        input: CreateIntentInput,
    ) -> Result<CreateIntentConsentResponse, CanisterError>;
}
