use candid::Principal;
use cashier_backend_types::{
    dto::{
        action::{ActionDto, CreateActionInput},
        link::LinkDto,
    },
    error::CanisterError,
    repository::{action::v1::ActionType, link::v1::Link},
};
use std::{fmt::Debug, future::Future, pin::Pin};

pub trait LinkV2State: Debug {
    fn publish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("publish not implemented")) })
    }
    fn unpublish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("unpublish not implemented")) })
    }
    fn claim(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("claim not implemented")) })
    }
    fn withdraw(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        Box::pin(async move { Err(CanisterError::from("withdraw not implemented")) })
    }
}

pub trait LinkV2: Debug {
    fn get_link_data(&self) -> Link;
    fn get_link_dto(&self) -> LinkDto {
        LinkDto::from(self.get_link_data())
    }
    fn create_action(
        &self,
        caller: Principal,
        action: ActionType,
    ) -> Result<ActionDto, CanisterError>;
    fn publish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>>;
    fn unpublish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>>;
    fn claim(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>>;
    fn withdraw(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>>;
}
