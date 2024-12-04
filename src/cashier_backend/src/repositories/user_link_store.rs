use crate::types::api::{FilterInput, PaginateInput, PaginateResult, PaginateResultMetadata};

use super::{entities::user_link::UserLink, USER_LINK_STORE};

pub fn create(user_link: UserLink) {
    USER_LINK_STORE.with(|store| {
        let pk = user_link.pk.clone();
        store.borrow_mut().insert(pk, user_link);
    });
}

pub fn get(id: &str) -> Option<UserLink> {
    USER_LINK_STORE.with(|store| store.borrow().get(&id.to_string()))
}

pub fn get_links_by_user_id(
    user_id: String,
    pagination: PaginateInput,
    _filter: Option<FilterInput>,
) -> Result<PaginateResult<UserLink>, String> {
    USER_LINK_STORE.with(|store| {
        let store = store.borrow();
        let mut result = Vec::new();
        let prefix = format!("user#{}#link#", user_id);

        for (_, user_link) in store
            .range(prefix.clone()..)
            .take_while(|(key, _)| key.starts_with(&prefix))
        {
            result.push(user_link);
        }

        // Sort the result by created_date
        result.sort_by(|a, b| b.created_at.cmp(&a.created_at));

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
