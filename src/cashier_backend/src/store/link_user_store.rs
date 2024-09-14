use crate::types::{
    api::{PaginateInput, PaginateResult, PaginateResultMetadata},
    link_user::LinkUser,
};

use super::LINK_USER_STORE;

pub fn create(key: String, ts: u64) {
    LINK_USER_STORE.with(|store| {
        store.borrow_mut().insert(key, ts);
    });
}

pub fn get(id: &str) -> Option<u64> {
    LINK_USER_STORE.with(|store| store.borrow().get(&id.to_string()))
}

pub fn get_links_by_user_id(
    user_id: String,
    pagination: PaginateInput,
) -> Result<PaginateResult<LinkUser>, String> {
    LINK_USER_STORE.with(|store| {
        let store = store.borrow();
        let mut result = Vec::new();
        let prefix = format!("{}#", user_id);

        for (key, ts) in store
            .range(prefix.clone()..)
            .take_while(|(key, _)| key.starts_with(&prefix))
        {
            let link_user = LinkUser::from_persistent(key, ts);
            result.push(link_user);
        }

        if pagination.offset as usize >= result.len() {
            return Ok(PaginateResult::default());
        }

        let end = (pagination.offset + pagination.limit).min(result.len());
        let res = result[pagination.offset..end].to_vec();
        let is_next = end < result.len();
        let is_previous = pagination.offset > 0;

        let metadata = PaginateResultMetadata::new(
            result.len(),
            pagination.offset,
            pagination.limit,
            is_next,
            is_previous,
        );
        let paginate_result = PaginateResult::new(res, metadata);
        Ok(paginate_result)
    })
}
