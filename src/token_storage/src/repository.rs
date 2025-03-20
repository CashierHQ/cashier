use std::cell::RefCell;

use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

use crate::types::{Candid, UserToken};

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

const UPGRADES: MemoryId = MemoryId::new(0);

const TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static TOKEN_STORE: RefCell<StableBTreeMap<String, Candid<Vec<UserToken>>, Memory>> =
        RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_MEMORY_ID)),
            )
        );
}

pub struct TokenRepository {}

impl TokenRepository {
    pub fn new() -> Self {
        Self {}
    }

    pub fn add_token(&self, id: String, token: UserToken) {
        TOKEN_STORE.with_borrow_mut(|store| {
            let user_tokens = store.get(&id).unwrap_or_default();

            let mut tokens = user_tokens.into_inner();
            tokens.push(token);

            store.insert(id, Candid(tokens));
        });
    }

    pub fn remove_token(&self, id: &String, find: &dyn Fn(&UserToken) -> bool) {
        TOKEN_STORE.with_borrow_mut(|store| match store.get(id) {
            Some(Candid(mut user_tokens)) => {
                if let Some(p) = user_tokens.iter().position(find) {
                    user_tokens.swap_remove(p);
                    store.insert(id.to_string(), Candid(user_tokens));
                }
            }
            None => {}
        });
    }

    pub fn list_tokens(&self, id: &String) -> Vec<UserToken> {
        TOKEN_STORE
            .with_borrow(|store| store.get(id))
            .unwrap_or_default()
            .into_inner()
    }
}

pub fn load() {
    TOKEN_STORE.with_borrow_mut(|store| {
        *store = StableBTreeMap::init(MEMORY_MANAGER.with_borrow(|m| m.get(TOKEN_MEMORY_ID)));
    });
}
