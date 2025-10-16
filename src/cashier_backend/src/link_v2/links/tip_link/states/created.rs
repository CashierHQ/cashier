use crate::{
    link_v2::{
        traits::LinkV2State,
        utils::{get_link_account, get_link_ext_account},
    },
    services::ext::icrc_token::{self, IcrcTokenService},
};
use candid::Principal;
use cashier_backend_types::{
    error::CanisterError,
    repository::{
        common::Asset,
        link::v1::{Link, LinkState},
    },
};
use std::{fmt::Debug, future::Future, pin::Pin};

#[derive(Debug)]
pub struct CreatedState {
    pub link: Link,
    pub canister_id: Principal,
}

impl CreatedState {
    pub fn new(link: &Link, canister_id: Principal) -> Self {
        Self {
            link: link.clone(),
            canister_id,
        }
    }
}

impl LinkV2State for CreatedState {
    fn activate(&self) -> Pin<Box<dyn Future<Output = Result<Link, CanisterError>>>> {
        let mut link = self.link.clone();

        Box::pin(async move {
            let link_account = get_link_ext_account(&link.id, self.canister_id)?;

            // check if the link balance is sufficient before activating
            link.asset_info.iter().for_each(|info| {
                let address: Principal = match info.asset {
                    Asset::IC { address } => address,
                };
                let icrc_service = icrc_token::Service::new(address.clone());
                let balance = icrc_service.icrc_1_balance_of(&link_account).await;
            });

            link.state = LinkState::Active;
            Ok(link)
        })
    }
}
