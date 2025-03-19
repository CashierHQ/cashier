use std::cell::RefCell;

use cashier_types::Token;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

use crate::types::Candid;

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

const UPGRADES: MemoryId = MemoryId::new(0);

const TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static TOKEN_STORE: RefCell<StableBTreeMap<String, Candid<Vec<Token>>, Memory>> =
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

    pub fn add_token(&self, id: String, token: Token) {
        TOKEN_STORE.with_borrow_mut(|store| {
            store.insert(id, Candid(vec![token]));
        });
    }

    pub fn remove_token(&self, id: &String) {
        TOKEN_STORE.with_borrow_mut(|store| {
            store.remove(id);
        });
    }

    pub fn list_tokens(&self, id: &String) -> Vec<Token> {
        TOKEN_STORE
            .with_borrow(|store| store.get(id))
            .unwrap_or_default()
            .into_inner()
    }
}
