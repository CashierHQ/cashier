use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    link_v2::CreateActionResult,
    repository::{action::v1::ActionType, link::v1::Link},
};
use std::{fmt::Debug, future::Future, pin::Pin};

pub trait LinkV2: Debug {
    fn get_link_model(&self) -> Link;

    fn create_action(
        &self,
        caller: Principal,
        action: ActionType,
        created_at_ts: u64,
    ) -> Result<CreateActionResult, CanisterError>;

    fn publish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("publish not implemented")) })
    }
}

pub trait LinkV2State: Debug {
    fn publish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("publish not implemented")) })
    }
}
