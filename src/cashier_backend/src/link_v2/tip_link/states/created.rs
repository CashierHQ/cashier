use crate::link_v2::{tip_link::states::active::ActiveState, traits::LinkV2State};
use cashier_backend_types::repository::link::v1::{Link, LinkState};
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
    fn go_next(&self) -> Pin<Box<dyn Future<Output = Result<Box<dyn LinkV2State>, String>>>> {
        let mut link_clone = self.link.clone();
        Box::pin(async move {
            // TODO: validation logic

            // Transition to Active state
            link_clone.state = LinkState::Active;
            Ok(Box::new(ActiveState::new(&link_clone)) as Box<dyn LinkV2State>)
        })
    }
}
