use crate::link_v2::traits::LinkV2State;
use cashier_backend_types::{
    error::CanisterError,
    repository::link::v1::{Link, LinkState},
};
use std::{fmt::Debug, future::Future, pin::Pin};

#[derive(Debug)]
pub struct CreatedState {
    pub link: Link,
}

impl CreatedState {
    pub fn new(link: &Link) -> Self {
        Self { link: link.clone() }
    }
}

impl LinkV2State for CreatedState {
    fn publish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let mut link_clone = self.link.clone();
        Box::pin(async move {
            link_clone.state = LinkState::Active;
            Ok(link_clone)
        })
    }
}
