// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repository::{Repositories, settings::SettingsRepository};

/// The settings service
pub struct SettingsService<R: Repositories> {
    pub settings_repo: SettingsRepository<R::Settings>,
}

impl<R: Repositories> SettingsService<R> {
    /// Create a new SettingsService
    pub fn new(repositories: &R) -> Self {
        Self {
            settings_repo: repositories.settings(),
        }
    }

    /// Get the inspect message enabled setting
    /// # Returns
    /// * `true` if the inspect message is enabled, `false` otherwise
    pub fn is_inspect_message_enabled(&self) -> bool {
        self.settings_repo
            .read(|settings| settings.inspect_message_enabled)
    }

    /// Set the inspect message enabled setting
    /// # Arguments
    /// * `inspect_message_enabled` - The new value for the inspect message enabled setting
    pub fn set_inspect_message_enabled(&mut self, inspect_message_enabled: bool) {
        self.settings_repo.update(|settings| {
            settings.inspect_message_enabled = inspect_message_enabled;
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
}
