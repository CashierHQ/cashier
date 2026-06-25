// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;

use crate::repository::{
    Repositories,
    settings::{Settings, SettingsRepository},
};

/// The settings service
pub struct SettingsService<R: Repositories> {
    pub settings_repo: SettingsRepository<R::Settings>,
}

impl<R: Repositories> SettingsService<R> {
    /// Create a new `SettingsService`.
    /// # Arguments
    /// * `repositories` - Repository factory used to obtain the settings repository
    /// # Returns
    /// * `SettingsService` - A new service instance
    pub fn new(repositories: &R) -> Self {
        Self {
            settings_repo: repositories.settings(),
        }
    }

    /// Get the inspect message enabled setting.
    /// # Returns
    /// * `bool` - `true` if the inspect message is enabled, `false` otherwise
    pub fn is_inspect_message_enabled(&self) -> bool {
        self.settings_repo
            .read(|settings| settings.inspect_message_enabled)
    }

    /// Set the inspect message enabled setting.
    /// # Arguments
    /// * `inspect_message_enabled` - New value for the inspect-message flag
    pub fn set_inspect_message_enabled(&mut self, inspect_message_enabled: bool) {
        self.settings_repo.update(|settings| {
            settings.inspect_message_enabled = inspect_message_enabled;
        });
    }

    /// Get the full settings snapshot (for admin read-back / verification).
    /// # Returns
    /// * `Settings` - A clone of the current canister settings
    pub fn get(&self) -> Settings {
        self.settings_repo.read(Clone::clone)
    }

    /// Get the CKBTC minter canister id (anonymous principal until set at init/admin).
    /// # Returns
    /// * `Principal` - The CKBTC minter canister id
    pub fn get_ckbtc_minter_id(&self) -> Principal {
        self.settings_repo.read(|settings| settings.ckbtc_minter_id)
    }

    /// Set the CKBTC minter canister id (persisted in stable memory).
    /// # Arguments
    /// * `canister_id` - The CKBTC minter canister principal
    pub fn set_ckbtc_minter_id(&mut self, canister_id: Principal) {
        self.settings_repo.update(|settings| {
            settings.ckbtc_minter_id = canister_id;
        });
    }

    /// Get the Omnity Bitcoin canister id (anonymous principal until set at init/admin).
    /// # Returns
    /// * `Principal` - The Omnity Bitcoin canister id
    pub fn get_omnity_bitcoin_id(&self) -> Principal {
        self.settings_repo
            .read(|settings| settings.omnity_bitcoin_id)
    }

    /// Set the Omnity Bitcoin canister id (persisted in stable memory).
    /// # Arguments
    /// * `canister_id` - The Omnity Bitcoin canister principal
    pub fn set_omnity_bitcoin_id(&mut self, canister_id: Principal) {
        self.settings_repo.update(|settings| {
            settings.omnity_bitcoin_id = canister_id;
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repository::tests::TestRepositories;

    #[test]
    fn it_should_do_return_inspect_message_enabled_by_default() {
        // Arrange
        let repositories = TestRepositories::new();
        let settings_service = SettingsService::new(&repositories);

        // Act
        let result = settings_service.is_inspect_message_enabled();

        // Assert
        assert!(result);
    }

    #[test]
    fn it_should_do_set_inspect_message_enabled_to_false() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut settings_service = SettingsService::new(&repositories);

        // Act
        settings_service.set_inspect_message_enabled(false);
        let result = settings_service.is_inspect_message_enabled();

        // Assert
        assert!(!result);
    }

    #[test]
    fn it_should_do_set_inspect_message_enabled_to_true() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut settings_service = SettingsService::new(&repositories);
        settings_service.set_inspect_message_enabled(false);

        // Act
        settings_service.set_inspect_message_enabled(true);
        let result = settings_service.is_inspect_message_enabled();

        // Assert
        assert!(result);
    }

    #[test]
    fn it_should_set_and_get_ckbtc_minter_id() {
        use candid::Principal;

        // Arrange
        let repositories = TestRepositories::new();
        let mut settings_service = SettingsService::new(&repositories);
        let id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        assert_eq!(settings_service.get_ckbtc_minter_id(), Principal::anonymous());

        // Act
        settings_service.set_ckbtc_minter_id(id);

        // Assert (read back via getter and via the full snapshot)
        assert_eq!(settings_service.get_ckbtc_minter_id(), id);
        assert_eq!(settings_service.get().ckbtc_minter_id, id);
    }

    #[test]
    fn it_should_set_and_get_omnity_bitcoin_id() {
        use candid::Principal;

        // Arrange
        let repositories = TestRepositories::new();
        let mut settings_service = SettingsService::new(&repositories);
        let id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        assert_eq!(
            settings_service.get_omnity_bitcoin_id(),
            Principal::anonymous()
        );

        // Act
        settings_service.set_omnity_bitcoin_id(id);

        // Assert
        assert_eq!(settings_service.get_omnity_bitcoin_id(), id);
    }
}
