use crate::link_v2::traits::LinkV2State;
use cashier_backend_types::{
    error::CanisterError,
    repository::link::v1::{Link, LinkState},
};
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
    fn claim(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let mut link_clone = self.link.clone();
        Box::pin(async move {
            link_clone.link_use_action_counter += 1;
            if link_clone.link_use_action_counter >= link_clone.link_use_action_max_count {
                link_clone.state = LinkState::InactiveEnded;
            }
            Ok(link_clone)
        })
    }

    fn unpublish(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let mut link = self.link.clone();
        Box::pin(async move {
            link.state = LinkState::Inactive;

            Ok(link)
        })
    }
}
