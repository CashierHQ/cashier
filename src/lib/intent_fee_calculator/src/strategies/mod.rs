// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

mod creator_to_link;
mod creator_to_treasury;
mod helpers;
mod link_to_creator;
mod link_to_user;
mod user_to_link;

use crate::traits::IntentFeeStrategy;
use crate::types::IntentFlow;

pub use creator_to_link::CreatorToLinkStrategy;
pub use creator_to_treasury::CreatorToTreasuryStrategy;
pub use link_to_creator::LinkToCreatorStrategy;
pub use link_to_user::LinkToUserStrategy;
pub use user_to_link::UserToLinkStrategy;

/// Get strategy for flow
pub fn get_strategy(flow: IntentFlow) -> Box<dyn IntentFeeStrategy> {
    match flow {
        IntentFlow::CreatorToTreasury => Box::new(CreatorToTreasuryStrategy),
        IntentFlow::CreatorToLink => Box::new(CreatorToLinkStrategy),
        IntentFlow::UserToLink => Box::new(UserToLinkStrategy),
        IntentFlow::LinkToUser => Box::new(LinkToUserStrategy),
        IntentFlow::LinkToCreator => Box::new(LinkToCreatorStrategy),
    }
}
