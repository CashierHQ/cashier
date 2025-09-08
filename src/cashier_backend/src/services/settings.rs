use crate::repositories::{settings::SettingsRepository, Repositories};

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
    pub fn is_inspect_message_enabled(&self) -> bool {
        self.settings_repo.read(|settings| settings.inspect_message_enabled.clone())
    }

    /// Set the inspect message enabled setting
    pub fn set_inspect_message_enabled(&mut self, inspect_message_enabled: bool) {
        self.settings_repo.update(|settings| {
            settings.inspect_message_enabled = inspect_message_enabled;
        });
    }

}