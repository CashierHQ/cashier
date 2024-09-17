use crate::{
    store::link_store,
    types::link_detail::{LinkDetail, LinkDetailUpdate, State},
};

pub fn handle_update_create_and_airdrop_detail(
    id: String,
    mut input: LinkDetailUpdate,
    mut link_detail: LinkDetail,
) -> Result<LinkDetail, String> {
    match link_detail.state {
        Some(State::New) => {
            // Validate
            if input.title.is_none() {
                return Err("Title is required".to_string());
            }

            // Update to PendingDetail
            input.state = Some(State::PendingDetail);
            link_detail.update(input);

            link_store::update(id.clone(), link_detail.clone());

            return Ok(link_detail);
        }
        _ => return Err("State is not implement or not found".to_string()),
    }
}
