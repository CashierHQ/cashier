use std::cell::RefCell;

use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};

use crate::types::link_detail::LinkDetail;
use crate::types::user::User;

const UPGRADES: MemoryId = MemoryId::new(0);
const USER_MEMORY_ID: MemoryId = MemoryId::new(1);
const LINK_MEMORY_ID: MemoryId = MemoryId::new(2);

type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static USER_STORE: RefCell<StableBTreeMap<
        String,
        User,
        Memory
    >> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(USER_MEMORY_ID)),
        )
    );

    static LINK_STORE: RefCell<StableBTreeMap<
        String,
        LinkDetail,
        Memory
        >> = RefCell::new(
            StableBTreeMap::init(
                MEMORY_MANAGER.with_borrow(|m| m.get(LINK_MEMORY_ID)),
            )
        );

}
