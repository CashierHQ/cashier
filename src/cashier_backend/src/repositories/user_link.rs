use super::USER_LINK_STORE;
use crate::types::api::{PaginateInput, PaginateResult, PaginateResultMetadata};
use cashier_types::{UserLink, UserLinkKey};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct UserLinkRepository {}

#[cfg_attr(test, faux::methods)]
impl UserLinkRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn create(&self, user_link: UserLink) {
        USER_LINK_STORE.with_borrow_mut(|store| {
            let id: UserLinkKey = UserLinkKey {
                user_id: user_link.user_id.clone(),
                link_id: user_link.link_id.clone(),
            };
            store.insert(id.to_str(), user_link);
        });
    }

    pub fn batch_create(&self, user_links: Vec<UserLink>) {
        USER_LINK_STORE.with_borrow_mut(|store| {
            for user_link in user_links {
                let id = UserLinkKey {
                    user_id: user_link.user_id.clone(),
                    link_id: user_link.link_id.clone(),
                };
                store.insert(id.to_str(), user_link);
            }
        });
    }

    pub fn get(&self, id: UserLinkKey) -> Option<UserLink> {
        USER_LINK_STORE.with_borrow(|store| store.get(&id.to_str()))
    }

    pub fn get_links_by_user_id(
        &self,
        user_id: String,
        paginate: PaginateInput,
    ) -> PaginateResult<UserLink> {
        USER_LINK_STORE.with_borrow(|store| {
            let user_link_key = UserLinkKey {
                user_id: user_id.clone(),
                link_id: "".to_string(),
            };

            let prefix = user_link_key.to_str();
            let all_links: Vec<UserLink> = store
                .range(prefix.to_string()..)
                .take_while(|(key, _)| key.starts_with(&prefix))
                .map(|(_, link)| link.clone())
                .collect();

            let total = all_links.len();
            let offset = paginate.offset;
            let limit = paginate.limit;
            let paginated_links: Vec<UserLink> =
                all_links.iter().skip(offset).take(limit).cloned().collect();

            let is_next = offset + limit < total;
            let is_prev = offset > 0;

            PaginateResult {
                data: paginated_links,
                metadata: PaginateResultMetadata {
                    total,
                    offset,
                    limit,
                    is_next,
                    is_prev,
                },
            }
        })
    }
}
