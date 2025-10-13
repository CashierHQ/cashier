use crate::link_v2::traits::LinkV2Action;
use cashier_backend_types::{
    dto::action::ActionDto, error::CanisterError, repository::link::v1::Link,
};

#[derive(Debug)]
pub struct CreateAction {
    pub link: Link,
}

impl CreateAction {
    pub fn new(link: Link) -> Self {
        Self { link }
    }
}

impl LinkV2Action for CreateAction {
    fn get_action_data(&self) -> Result<ActionDto, CanisterError> {
        Err(CanisterError::from(
            "Create action not implemented for tip link",
        ))
    }
}
