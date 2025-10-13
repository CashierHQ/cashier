use crate::link_v2::traits::LinkV2State;
use cashier_backend_types::repository::link::v1::Link;
use std::{fmt::Debug, future::Future, pin::Pin};

#[derive(Debug)]
pub struct InactiveEndedState {
    pub link: Link,
}

impl InactiveEndedState {
    pub fn new(link: &Link) -> Self {
        Self { link: link.clone() }
    }
}

impl LinkV2State for InactiveEndedState {
    fn go_next(&self) -> Pin<Box<dyn Future<Output = Result<Box<dyn LinkV2State>, String>>>> {
        Box::pin(async move { Err("go_next not implemented".to_string()) })
    }
}
