use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        action::v1::{Action, ActionType},
        intent::v2::Intent,
        link::v1::Link,
        transaction::v2::Transaction,
    },
};
use std::{collections::HashMap, fmt::Debug, future::Future, pin::Pin};

pub trait LinkV2: Debug {
    fn get_link_model(&self) -> Link;

    fn create_action(
        &self,
        caller: Principal,
        action: ActionType,
        created_at_ts: u64,
    ) -> Result<Box<dyn LinkV2Action>, CanisterError>;

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

pub trait LinkV2Action: Debug {
    fn get_action(&self) -> Action;
    fn get_intents(&self) -> Vec<Intent>;
    fn get_intent_txs_map(&self) -> HashMap<String, Vec<Transaction>>;
}
