// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_common::constant::DEFAULT_TIMEOUT_BOUNDED_CALL_SECS;
use gate_service_client::{CanisterClientResult, IcCanisterClient, client::GateServiceClient};
use gate_service_types::{Gate, error::GateServiceError};

use crate::repositories::{Repositories, settings::SettingsRepository};

pub struct GateService<R: Repositories> {
    settings_repository: SettingsRepository<R::Settings>,
}

pub trait GateServiceTrait {
    async fn get_gate_by_link_id(
        &self,
        link_id: &str,
    ) -> CanisterClientResult<Result<Option<Gate>, GateServiceError>>;
}

impl<R: Repositories> GateService<R> {
    /// Create a new GateService using the gate canister principal stored in
    /// the settings repository.
    pub fn new(repo: &R) -> Self {
        Self {
            settings_repository: repo.settings(),
        }
    }

    pub fn get_client(&self) -> GateServiceClient<IcCanisterClient> {
        let gate_service_principal_id = self
            .settings_repository
            .read(|settings| settings.gate_canister_principal);
        let canister_client = IcCanisterClient::new(
            gate_service_principal_id,
            Some(DEFAULT_TIMEOUT_BOUNDED_CALL_SECS),
        );
        GateServiceClient::new(canister_client)
    }
}

impl<R: Repositories> GateServiceTrait for GateService<R> {
    /// Get a gate by its link ID.
    ///
    /// # Arguments
    /// * `link_id` - The link ID of the gate to retrieve.
    ///
    /// # Returns
    /// A result containing an optional gate if found, or an error.
    async fn get_gate_by_link_id(
        &self,
        link_id: &str,
    ) -> CanisterClientResult<Result<Option<Gate>, GateServiceError>> {
        let client = self.get_client();
        client.get_gate_by_subject(link_id.to_string()).await
    }
}

#[cfg(test)]
mod tests {
    use candid::Principal;

    use crate::utils::test_utils::gate_service_mock::GateServiceMock;

    use super::*;

    #[tokio::test]
    async fn it_should_get_gate_by_link_id() {
        // Arrange
        let mut service = GateServiceMock::new();
        let link_id = "test_link_id";
        let creator_id = Principal::from_text("aaaaa-aa").unwrap();

        // Seed a gate for this link so get_gate_by_link_id returns Some(gate)
        service.add_test_gate(Gate {
            id: format!("gate_{}", link_id),
            creator: creator_id,
            subject_id: link_id.to_string(),
            key: gate_service_types::GateKey::PasswordRedacted,
        });

        // Act
        let result = service.get_gate_by_link_id(link_id).await;

        // Assert
        assert!(result.is_ok());
        let gate_result = result.unwrap();
        assert!(gate_result.is_ok());
        let gate_option = gate_result.unwrap();
        assert!(gate_option.is_some());
        let gate = gate_option.unwrap();
        assert_eq!(gate.subject_id, link_id);
    }
}
