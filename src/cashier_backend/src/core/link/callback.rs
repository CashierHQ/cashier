use cashier_types::{ActionState, ActionType};

use crate::{error, info, services::link::v2::LinkService, utils::runtime::RealIcEnvironment};

/// Callback function for handling action state transitions when an action is updated
///
/// Specifically designed to handle Claim action types that have successfully completed
/// by updating the corresponding link properties.
///
/// # Arguments
/// * `previous_state` - The state of the action before the update
/// * `current_state` - The state of the action after the update
/// * `link_id` - The ID of the link associated with the action
/// * `action_type` - The type of action being updated
/// * `action_id` - The ID of the action being updated
pub fn update_action_claim_callback(
    previous_state: ActionState,
    current_state: ActionState,
    link_id: String,
    action_type: ActionType,
    action_id: String,
) {
    info!(
        "[update_action_claim_callback] previous_state: {:?}, current_state: {:?}, link_id: {:?}, action_type: {:?}",
        previous_state, current_state, link_id, action_type
    );

    // get instance of link service
    let link_service: LinkService<RealIcEnvironment> = LinkService::get_instance();

    let is_state_changed = previous_state != current_state;

    if action_type == ActionType::Claim && is_state_changed && current_state == ActionState::Success
    {
        // update link properties
        let res = link_service.update_link_properties(link_id.clone(), action_id.clone());
        match res {
            Ok(_) => {
                info!(
                    "[update_action_claim_callback] Successfully updated link properties for link_id: {:?}, action_id: {:?}",
                    link_id, action_id
                );
            }
            Err(err) => {
                error!(
                    "[update_action_claim_callback] Failed to update link properties for link_id: {:?}, action_id: {:?}, error: {:?}",
                    link_id, action_id, err
                );
            }
        }
    }
}

pub fn empty_callback(
    _previous_state: ActionState,
    _current_state: ActionState,
    _link_id: String,
    _action_type: ActionType,
    _action_id: String,
) {
    // No operation
}
