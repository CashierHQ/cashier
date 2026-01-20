// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use cashier_backend_types::repository::intent::v1::IntentTask;
use cashier_backend_types::repository::intent::v2::Intent;
use cashier_backend_types::repository::link::v1::Link;

use crate::types::IntentFlow;

/// Auto-detect intent flow from intent + link + caller
/// # Arguments
/// * `intent` - The intent to analyze
/// * `link` - The link to analyze
/// * `caller` - The principal who initiated the action
/// # Returns
/// * `IntentFlow` - The detected intent flow
pub fn detect_flow(intent: &Intent, link: &Link, caller: Principal) -> IntentFlow {
    match intent.task {
        IntentTask::TransferWalletToTreasury => IntentFlow::CreatorToTreasury,

        IntentTask::TransferWalletToLink => {
            if caller == link.creator {
                IntentFlow::CreatorToLink
            } else {
                IntentFlow::UserToLink
            }
        }

        IntentTask::TransferLinkToWallet => {
            if caller == link.creator {
                IntentFlow::LinkToCreator
            } else {
                IntentFlow::LinkToUser
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_intent(task: IntentTask) -> Intent {
        Intent {
            task,
            ..Default::default()
        }
    }

    fn make_link(creator: Principal) -> Link {
        use cashier_backend_types::repository::link::v1::{LinkState, LinkType};
        Link {
            id: "test-link".to_string(),
            state: LinkState::Active,
            title: "Test".to_string(),
            link_type: LinkType::SendTip,
            asset_info: vec![],
            creator,
            create_at: 0,
            link_use_action_counter: 0,
            link_use_action_max_count: 1,
        }
    }

    #[test]
    fn test_detect_treasury_flow() {
        let creator = Principal::anonymous();
        let intent = make_intent(IntentTask::TransferWalletToTreasury);
        let link = make_link(creator);
        assert_eq!(
            detect_flow(&intent, &link, creator),
            IntentFlow::CreatorToTreasury
        );
    }

    #[test]
    fn test_detect_creator_to_link() {
        let creator = Principal::anonymous();
        let intent = make_intent(IntentTask::TransferWalletToLink);
        let link = make_link(creator);
        assert_eq!(
            detect_flow(&intent, &link, creator),
            IntentFlow::CreatorToLink
        );
    }

    #[test]
    fn test_detect_user_to_link() {
        let creator = Principal::anonymous();
        let user = Principal::from_text("aaaaa-aa").unwrap();
        let intent = make_intent(IntentTask::TransferWalletToLink);
        let link = make_link(creator);
        assert_eq!(detect_flow(&intent, &link, user), IntentFlow::UserToLink);
    }

    #[test]
    fn test_detect_link_to_user() {
        let creator = Principal::anonymous();
        let user = Principal::from_text("aaaaa-aa").unwrap();
        let intent = make_intent(IntentTask::TransferLinkToWallet);
        let link = make_link(creator);
        assert_eq!(detect_flow(&intent, &link, user), IntentFlow::LinkToUser);
    }

    #[test]
    fn test_detect_link_to_creator() {
        let creator = Principal::anonymous();
        let intent = make_intent(IntentTask::TransferLinkToWallet);
        let link = make_link(creator);
        assert_eq!(
            detect_flow(&intent, &link, creator),
            IntentFlow::LinkToCreator
        );
    }
}
