pub mod states;

use crate::link_v2::traits::{LinkV2, LinkV2State};
use cashier_backend_types::{
    dto::link::{self, LinkDto},
    repository::link::v1::{Link, LinkState},
};
use states::{
    active::ActiveState, created::CreatedState, inactive::InactiveState,
    inactive_ended::InactiveEndedState,
};
use std::{future::Future, pin::Pin};

#[derive(Debug)]
pub struct TipLink {
    pub link: Link,
    state: Box<dyn LinkV2State>,
}

impl TipLink {
    pub fn new(link: Link) -> Self {
        let state = match link.state {
            LinkState::CreateLink => Box::new(CreatedState::new(&link)) as Box<dyn LinkV2State>,
            LinkState::Active => Box::new(ActiveState::new(&link)) as Box<dyn LinkV2State>,
            LinkState::Inactive => Box::new(InactiveState::new(&link)) as Box<dyn LinkV2State>,
            LinkState::InactiveEnded => {
                Box::new(InactiveEndedState::new(&link)) as Box<dyn LinkV2State>
            }
        };
        Self { link, state }
    }
}

impl LinkV2 for TipLink {
    fn publish(&self) -> Pin<Box<dyn Future<Output = Result<LinkDto, String>>>> {
        let link = self.link.clone();

        Box::pin(async move {
            if link.state != LinkState::CreateLink {
                return Err("Only links in 'CreateLink' state can be published".to_string());
            }

            Ok(LinkDto::from(link))
        })
    }
    fn unpublish(&self) -> Pin<Box<dyn Future<Output = Result<LinkDto, String>>>> {
        let link = self.link.clone();
        Box::pin(async move {
            if link.state != LinkState::Active {
                return Err("Only links in 'Active' state can be unpublished".to_string());
            }

            Ok(LinkDto::from(link))
        })
    }
    fn claim(&self) -> Pin<Box<dyn Future<Output = Result<LinkDto, String>>>> {
        let link = self.link.clone();
        Box::pin(async move {
            if link.state != LinkState::Active {
                return Err("Only links in 'Active' state can be claimed".to_string());
            }

            Ok(LinkDto::from(link))
        })
    }
    fn withdraw(&self) -> Pin<Box<dyn Future<Output = Result<LinkDto, String>>>> {
        let link = self.link.clone();
        Box::pin(async move {
            if link.state != LinkState::Inactive {
                return Err("Only links in 'Inactive' state can be withdrawn".to_string());
            }

            Ok(LinkDto::from(link))
        })
    }
}
