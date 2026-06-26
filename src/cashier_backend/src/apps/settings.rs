use candid::Principal;

use crate::repositories::{
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

    /// Set the token storage canister id (persisted in stable memory).
    /// # Arguments
    /// * `canister_id` - The token_storage canister principal
    pub fn set_token_storage_canister_id(&mut self, canister_id: Principal) {
        self.settings_repo.update(|settings| {
            settings.token_storage_canister_id = canister_id;
        });
    }

    /// Set the gate service canister id (persisted in stable memory).
    /// # Arguments
    /// * `canister_id` - The gate_service canister principal
    pub fn set_gate_service_canister_id(&mut self, canister_id: Principal) {
        self.settings_repo.update(|settings| {
            settings.gate_service_canister_id = canister_id;
        });
    }
}

#[cfg(test)]
mod tests {
    use super::SettingsService;
    use crate::repositories::tests::TestRepositories;
    use candid::Principal;

    #[test]
    fn it_should_return_inspect_message_enabled_by_default() {
        // Arrange
        let repositories = TestRepositories::new();
        let service = SettingsService::new(&repositories);

        // Act
        let result = service.is_inspect_message_enabled();

        // Assert
        assert!(result);
    }

    #[test]
    fn it_should_set_inspect_message_enabled_to_false() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = SettingsService::new(&repositories);

        // Act
        service.set_inspect_message_enabled(false);

        // Assert
        assert!(!service.is_inspect_message_enabled());
    }

    #[test]
    fn it_should_set_and_get_token_storage_canister_id() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = SettingsService::new(&repositories);
        let id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
        // Default is the anonymous principal (read back via the full snapshot).
        assert_eq!(
            service.get().token_storage_canister_id,
            Principal::anonymous()
        );

        // Act
        service.set_token_storage_canister_id(id);

        // Assert
        assert_eq!(service.get().token_storage_canister_id, id);
    }

    #[test]
    fn it_should_set_and_get_gate_service_canister_id() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut service = SettingsService::new(&repositories);
        let id = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        assert_eq!(
            service.get().gate_service_canister_id,
            Principal::anonymous()
        );

        // Act
        service.set_gate_service_canister_id(id);

        // Assert
        assert_eq!(service.get().gate_service_canister_id, id);
    }
}
