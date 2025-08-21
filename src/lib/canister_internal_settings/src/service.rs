use crate::types::{CanisterInternalSettings, CanisterInternalSettingsStorage};
use candid::Principal;
use ic_mple_utils::store::Storage;

/// Service to manage canister settings persisted in stable storage.
pub struct CanisterInternalSettingsService<S: Storage<CanisterInternalSettingsStorage>> {
    pub canister_internal_settings_store: S,
}

impl<S: Storage<CanisterInternalSettingsStorage>> CanisterInternalSettingsService<S> {
    pub fn new(canister_internal_settings_store: S) -> Self {
        Self {
            canister_internal_settings_store,
        }
    }

    pub fn init(&mut self, settings: CanisterInternalSettings) {
        self.canister_internal_settings_store
            .with_borrow_mut(|store| {
                store.set(settings);
            });
    }

    pub fn add_admin(&mut self, principal: Principal) -> Result<(), String> {
        self.canister_internal_settings_store
            .with_borrow_mut(|store| {
                if store.get().list_admin.contains(&principal) {
                    return Err("Principal is already an admin".to_string());
                }

                let mut s = store.get().clone();
                s.list_admin.push(principal);
                store.set(s);

                Ok(())
            })
    }

    pub fn remove_admin(&mut self, principal: Principal) -> Result<(), String> {
        self.canister_internal_settings_store
            .with_borrow_mut(|store| {
                if !store.get().list_admin.contains(&principal) {
                    return Err("Principal is not an admin".to_string());
                }

                let mut s = store.get().clone();
                s.list_admin.retain(|p| p != &principal);
                store.set(s);

                Ok(())
            })
    }

    pub fn is_admin(&self, caller: Principal) -> bool {
        self.canister_internal_settings_store
            .with_borrow(|store| store.get().list_admin.contains(&caller))
    }

    pub fn get_mode(&self) -> CanisterInternalSettings {
        self.canister_internal_settings_store
            .with_borrow(|store| store.get().clone())
    }

    pub fn set_mode(&mut self, mode: crate::types::Mode) {
        self.canister_internal_settings_store
            .with_borrow_mut(|store| {
                let mut s = store.get().clone();
                s.mode = mode;
                store.set(s);
            });
    }

    pub fn get_setting(&self) -> CanisterInternalSettings {
        self.canister_internal_settings_store
            .with_borrow(|store| store.get().clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::prelude::*;
    use std::cell::RefCell;

    use candid::Principal;
    use ic_stable_structures::{
        DefaultMemoryImpl, StableCell,
        memory_manager::{MemoryId, MemoryManager},
    };

    pub fn random_principal_id() -> Principal {
        let mut rng = thread_rng();
        let mut arr = [0u8; 29];
        rng.fill_bytes(&mut arr);
        Principal::from_slice(&arr)
    }

    thread_local! {
        static SETTINGS_STORE: RefCell<CanisterInternalSettingsStorage> = RefCell::new(
            StableCell::new(
                MemoryManager::init(DefaultMemoryImpl::default()).get(MemoryId::new(1)),
                CanisterInternalSettings::default()
            )
        );
    }

    #[test]
    fn test_canister_internal_settings_service_with_thread_local() {
        let mut svc = CanisterInternalSettingsService::new(&SETTINGS_STORE);
        let p = random_principal_id();

        // initially not admin
        assert!(!svc.is_admin(p));

        // add admin and check
        let _ = svc.add_admin(p);
        assert!(svc.is_admin(p));

        // remove admin and check
        let _ = svc.remove_admin(p);
        assert!(!svc.is_admin(p));

        // mode default is Operational
        assert_eq!(svc.get_mode().mode, crate::types::Mode::Operational);

        // set mode to Maintenance
        svc.set_mode(crate::types::Mode::Maintenance);
        assert_eq!(svc.get_mode().mode, crate::types::Mode::Maintenance);
    }

    #[test]
    fn test_canister_internal_settings_service_with_local_var() {
        let store = RefCell::new(StableCell::new(
            MemoryManager::init(DefaultMemoryImpl::default()).get(MemoryId::new(1)),
            CanisterInternalSettings::default(),
        ));

        let mut svc = CanisterInternalSettingsService::new(store);
        let p = random_principal_id();
        assert!(!svc.is_admin(p));
        let _ = svc.add_admin(p);
        assert!(svc.is_admin(p));
    }

    #[test]
    fn test_init_and_get_setting_with_local_var() {
        use crate::types::Mode;

        let store = RefCell::new(StableCell::new(
            MemoryManager::init(DefaultMemoryImpl::default()).get(MemoryId::new(2)),
            CanisterInternalSettings::default(),
        ));

        let mut svc = CanisterInternalSettingsService::new(store);

        // prepare custom settings
        let admin = random_principal_id();
        let settings = CanisterInternalSettings {
            mode: Mode::Maintenance,
            list_admin: vec![admin],
        };

        svc.init(settings.clone());

        // get_setting should return the same persisted settings
        let got = svc.get_setting();
        assert_eq!(got, settings);

        // and is_admin should reflect persisted admin
        assert!(svc.is_admin(admin));
    }
}
