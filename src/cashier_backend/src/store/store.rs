use std::cell::RefCell;

use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

use super::types::{Comment, TokenRecord, User};

const UPGRADES: MemoryId = MemoryId::new(0);
const USER_MEMORY_ID: MemoryId = MemoryId::new(1);

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static TOKEN_STORE: RefCell<StableBTreeMap<
        String,
        TokenRecord,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_MEMORY_ID)),
        )
    );

    static USER_STORE: RefCell<StableBTreeMap<
        String,
        User,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)),
        )
    );

    static COMMENT_STORE: RefCell<StableBTreeMap<
        String,
        Comment,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(COMMENT_MEMORY_ID)),
        )
    );

}

pub fn get_upgrade_memory() -> Memory {
    MEMORY_MANAGER.with(|m| m.borrow().get(UPGRADES))
}

pub mod store_state {
    use super::*;

    pub fn load() {
        TOKEN_STORE.with(|t| {
            *t.borrow_mut() =
                StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_MEMORY_ID)));
        });
        USER_STORE.with(|t| {
            *t.borrow_mut() =
                StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)));
        });
        COMMENT_STORE.with(|t| {
            *t.borrow_mut() =
                StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(COMMENT_MEMORY_ID)));
        });
    }
}

pub mod token_store {
    use super::*;

    // count total
    pub fn count() -> u64 {
        TOKEN_STORE.with(|store| store.borrow().len())
    }

    pub fn get(token_pid: String) -> Option<TokenRecord> {
        TOKEN_STORE.with(|store| {
            let store = store.borrow();
            store.get(&token_pid)
        })
    }

    pub fn list(offset: usize, limit: usize) -> Vec<TokenRecord> {
        TOKEN_STORE.with(|store| {
            let records = store.borrow().iter().map(|(_, v)| v).collect::<Vec<_>>();

            // Ensure offset is within bounds
            if offset >= records.len() {
                return Vec::new();
            }

            let end = (offset + limit).min(records.len());
            records[offset..end].to_vec()
        })
    }

    pub async fn add(token: TokenRecord) -> Result<(), String> {
        // Clone the token to avoid moving it
        let token_clone = token.clone();

        // add token
        let _result_add = TOKEN_STORE.with(|store| {
            let mut store = store.borrow_mut();
            let id = token.token_pid.clone();
            store.insert(id, token);
        });

        let _ = user_store::add_token_created(token_clone.token_pid.clone())?;

        Ok(())
    }
}

pub mod user_store {
    use super::*;

    // count total
    pub fn count() -> u64 {
        USER_STORE.with(|store| store.borrow().len())
    }

    pub fn get(user_pid: String) -> Option<User> {
        USER_STORE.with(|store| {
            let store = store.borrow();

            match store.get(&user_pid) {
                Some(user) => Some(user.clone()),
                None => Some(User {
                    pid: user_pid,
                    token_created: vec![],
                    token_hold: vec![],
                }),
            }
        })
    }

    pub fn list(offset: usize, limit: usize) -> Vec<User> {
        USER_STORE.with(|store| {
            let records = store.borrow().iter().map(|(_, v)| v).collect::<Vec<_>>();

            // Ensure offset is within bounds
            if offset >= records.len() {
                return Vec::new();
            }

            let end = (offset + limit).min(records.len());
            records[offset..end].to_vec()
        })
    }

    pub fn upsert(user: User) -> Result<(), String> {
        let _result_add = USER_STORE.with(|store| {
            let id = user.pid.clone(); // Clone the pid to avoid moving it
            let mut store = store.borrow_mut();
            match store.get(&id) {
                Some(_) => {
                    store.insert(id, user);
                }
                None => {
                    store.insert(id, user);
                }
            }
        });

        Ok(())
    }

    pub fn add_token_created(token_pid: String) -> Result<(), String> {
        let _result_add = USER_STORE.with(|store| {
            let id = ic_cdk::api::caller().to_string(); // Clone the pid to avoid moving it
            let mut store = store.borrow_mut();
            match store.get(&id) {
                Some(mut user) => {
                    user.token_created.push(token_pid);
                    store.insert(id, user);
                }
                None => {
                    let user = User {
                        pid: id.clone(),
                        token_created: vec![token_pid],
                        token_hold: vec![],
                    };
                    store.insert(id, user);
                }
            }
        });

        Ok(())
    }

    pub fn add_token_hold(token_pid: String) -> Result<(), String> {
        let _result_add = USER_STORE.with(|store| {
            let id = ic_cdk::api::caller().to_string(); // Clone the pid to avoid moving it
            let mut store = store.borrow_mut();
            match store.get(&id) {
                Some(mut user) => {
                    user.token_hold.push(token_pid);
                    store.insert(id, user);
                }
                None => {
                    let user = User {
                        pid: id.clone(),
                        token_created: vec![],
                        token_hold: vec![token_pid],
                    };
                    store.insert(id, user);
                }
            }
        });

        Ok(())
    }
}

pub mod comment_store {
    use super::*;

    // REMEMBER: comment_id format: pacapump_id + "-" + comment_id
    pub fn get(comment_id: String) -> Option<Comment> {
        COMMENT_STORE.with(|store| {
            let store = store.borrow();
            store.get(&comment_id)
        })
    }

    //
    pub fn list(pacapump_id: String, offset: usize, limit: usize) -> Vec<Comment> {
        COMMENT_STORE.with(|c| {
            let mut result = Vec::new();
            let store = c.borrow_mut();
            let prefix = format!("{}-", pacapump_id);

            for (_, comment) in store
                .range(prefix.clone()..)
                .take_while(|(key, _)| key.starts_with(&prefix))
            {
                result.push(comment.clone());
            }
            // Ensure offset is within bounds
            if offset >= result.len() {
                return Vec::new();
            }
            let end = (offset + limit).min(result.len());
            result[offset..end].to_vec()
        })
    }

    pub fn count(pacapump_id: String) -> usize {
        COMMENT_STORE.with(|c| {
            let store = c.borrow();
            let prefix = format!("{}-", pacapump_id);
            let mut count = 0;

            for (_key, _) in store
                .range(prefix.clone()..)
                .take_while(|(key, _)| key.starts_with(&prefix))
            {
                count += 1;
            }

            count
        })
    }

    pub fn add(comment: Comment) -> Result<(), String> {
        let _result_add = COMMENT_STORE.with(|store| {
            let id = comment.construct_id();
            let mut store = store.borrow_mut();
            store.insert(id, comment);
        });

        Ok(())
    }
}
