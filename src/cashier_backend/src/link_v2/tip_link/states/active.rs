use crate::link_v2::traits::LinkV2State;
use cashier_backend_types::repository::link::v1::Link;
use std::{fmt::Debug, future::Future, pin::Pin};

#[derive(Debug)]
pub struct ActiveState {
    pub link: Link,
}

impl ActiveState {
    pub fn new(link: &Link) -> Self {
        Self { link: link.clone() }
    }
}

impl LinkV2State for ActiveState {
    fn go_next(&self) -> Pin<Box<dyn Future<Output = Result<Box<dyn LinkV2State>, String>>>> {
        Box::pin(async move { Err("go_next not implemented".to_string()) })
    }
}
