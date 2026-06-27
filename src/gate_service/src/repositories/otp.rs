// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use candid::Principal;
use gate_service_types::{GateUser, OtpRecord};
use ic_mple_log::service::Storage;
use std::collections::BTreeMap;

/// Stores pending OTP codes keyed by `(gate_id, user_principal)`.
pub type OtpStorage = BTreeMap<GateUser, OtpRecord>;

/// Repository for managing OTP records backed by a volatile `OtpStorage` map.
pub struct OtpRepository<S: Storage<OtpStorage>> {
    store: S,
}

impl<S: Storage<OtpStorage>> OtpRepository<S> {
    /// Creates a new `OtpRepository` backed by the provided store.
    /// # Arguments
    /// * `store`: Store mapping `(gate_id, user)` pairs to `OtpRecord` values.
    pub fn new(store: S) -> Self {
        Self { store }
    }

    /// Retrieves a pending OTP record for the given gate and user, if one exists.
    /// # Arguments
    /// * `gate_id`: The ID of the gate.
    /// * `user`: The principal of the user who requested the OTP.
    /// # Returns
    /// * `Some(OtpRecord)`: A pending (possibly expired) OTP record.
    /// * `None`: No OTP has been sent for this gate/user pair.
    pub fn get_otp_record(&self, gate_id: &str, user: Principal) -> Option<OtpRecord> {
        let key = GateUser {
            gate_id: gate_id.to_string(),
            user_id: user,
        };
        self.store.with_borrow(|m| m.get(&key).cloned())
    }

    /// Stores an OTP record for the given gate and user, replacing any existing record.
    /// # Arguments
    /// * `gate_id`: The ID of the gate.
    /// * `user`: The principal of the user who requested the OTP.
    /// * `record`: The OTP record to store.
    pub fn set_otp_record(&mut self, gate_id: &str, user: Principal, record: OtpRecord) {
        let key = GateUser {
            gate_id: gate_id.to_string(),
            user_id: user,
        };
        self.store.with_borrow_mut(|m| m.insert(key, record));
    }

    /// Removes the OTP record for the given gate and user.
    /// Called after successful verification or when the record is no longer needed.
    /// # Arguments
    /// * `gate_id`: The ID of the gate.
    /// * `user`: The principal of the user whose OTP record should be removed.
    pub fn delete_otp_record(&mut self, gate_id: &str, user: Principal) {
        let key = GateUser {
            gate_id: gate_id.to_string(),
            user_id: user,
        };
        self.store.with_borrow_mut(|m| m.remove(&key));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    fn fixture_of_otp_record(code: &str, expires_at: u64, attempts: u8) -> OtpRecord {
        OtpRecord {
            code: code.to_string(),
            expires_at,
            attempts,
        }
    }

    fn assert_otp_record_eq(actual: Option<OtpRecord>, expected: &OtpRecord) {
        let actual = actual.expect("OTP record should exist");
        assert_eq!(actual.code, expected.code);
        assert_eq!(actual.expires_at, expected.expires_at);
        assert_eq!(actual.attempts, expected.attempts);
    }

    #[test]
    fn it_should_return_none_when_otp_record_does_not_exist() {
        // Arrange
        let repo = TestRepositories::new().otp();
        let gate_id = random_id_string();
        let user = random_principal_id();

        // Act
        let result = repo.get_otp_record(&gate_id, user);

        // Assert
        assert!(result.is_none());
    }

    #[test]
    fn it_should_set_and_get_otp_record() {
        // Arrange
        let mut repo = TestRepositories::new().otp();
        let gate_id = random_id_string();
        let user = random_principal_id();
        let record = fixture_of_otp_record("123456", 600_000_000_000, 0);

        // Act
        repo.set_otp_record(&gate_id, user, record.clone());
        let result = repo.get_otp_record(&gate_id, user);

        // Assert
        assert_otp_record_eq(result, &record);
    }

    #[test]
    fn it_should_replace_existing_otp_record_for_same_gate_and_user() {
        // Arrange
        let mut repo = TestRepositories::new().otp();
        let gate_id = random_id_string();
        let user = random_principal_id();
        let first_record = fixture_of_otp_record("123456", 600_000_000_000, 0);
        let replacement_record = fixture_of_otp_record("654321", 700_000_000_000, 2);

        // Act
        repo.set_otp_record(&gate_id, user, first_record);
        repo.set_otp_record(&gate_id, user, replacement_record.clone());
        let result = repo.get_otp_record(&gate_id, user);

        // Assert
        assert_otp_record_eq(result, &replacement_record);
    }

    #[test]
    fn it_should_isolate_otp_records_by_gate_id() {
        // Arrange
        let mut repo = TestRepositories::new().otp();
        let first_gate_id = random_id_string();
        let second_gate_id = random_id_string();
        let user = random_principal_id();
        let first_record = fixture_of_otp_record("111111", 600_000_000_000, 0);
        let second_record = fixture_of_otp_record("222222", 700_000_000_000, 1);

        // Act
        repo.set_otp_record(&first_gate_id, user, first_record.clone());
        repo.set_otp_record(&second_gate_id, user, second_record.clone());

        // Assert
        assert_otp_record_eq(repo.get_otp_record(&first_gate_id, user), &first_record);
        assert_otp_record_eq(repo.get_otp_record(&second_gate_id, user), &second_record);
    }

    #[test]
    fn it_should_isolate_otp_records_by_user() {
        // Arrange
        let mut repo = TestRepositories::new().otp();
        let gate_id = random_id_string();
        let first_user = random_principal_id();
        let second_user = random_principal_id();
        let first_record = fixture_of_otp_record("111111", 600_000_000_000, 0);
        let second_record = fixture_of_otp_record("222222", 700_000_000_000, 1);

        // Act
        repo.set_otp_record(&gate_id, first_user, first_record.clone());
        repo.set_otp_record(&gate_id, second_user, second_record.clone());

        // Assert
        assert_otp_record_eq(repo.get_otp_record(&gate_id, first_user), &first_record);
        assert_otp_record_eq(repo.get_otp_record(&gate_id, second_user), &second_record);
    }

    #[test]
    fn it_should_delete_existing_otp_record() {
        // Arrange
        let mut repo = TestRepositories::new().otp();
        let gate_id = random_id_string();
        let user = random_principal_id();
        let record = fixture_of_otp_record("123456", 600_000_000_000, 0);
        repo.set_otp_record(&gate_id, user, record);

        // Act
        repo.delete_otp_record(&gate_id, user);

        // Assert
        assert!(repo.get_otp_record(&gate_id, user).is_none());
    }

    #[test]
    fn it_should_not_delete_other_otp_records() {
        // Arrange
        let mut repo = TestRepositories::new().otp();
        let first_gate_id = random_id_string();
        let second_gate_id = random_id_string();
        let user = random_principal_id();
        let remaining_record = fixture_of_otp_record("222222", 700_000_000_000, 1);
        repo.set_otp_record(
            &first_gate_id,
            user,
            fixture_of_otp_record("111111", 600_000_000_000, 0),
        );
        repo.set_otp_record(&second_gate_id, user, remaining_record.clone());

        // Act
        repo.delete_otp_record(&first_gate_id, user);

        // Assert
        assert!(repo.get_otp_record(&first_gate_id, user).is_none());
        assert_otp_record_eq(
            repo.get_otp_record(&second_gate_id, user),
            &remaining_record,
        );
    }

    #[test]
    fn it_should_noop_when_deleting_missing_otp_record() {
        // Arrange
        let mut repo = TestRepositories::new().otp();
        let gate_id = random_id_string();
        let user = random_principal_id();

        // Act
        repo.delete_otp_record(&gate_id, user);

        // Assert
        assert!(repo.get_otp_record(&gate_id, user).is_none());
    }

    #[test]
    fn it_should_share_records_across_repositories_with_same_storage() {
        // Arrange
        let repositories = TestRepositories::new();
        let mut first_repo = repositories.otp();
        let second_repo = repositories.otp();
        let gate_id = random_id_string();
        let user = random_principal_id();
        let record = fixture_of_otp_record("123456", 600_000_000_000, 0);

        // Act
        first_repo.set_otp_record(&gate_id, user, record.clone());

        // Assert
        assert_otp_record_eq(second_repo.get_otp_record(&gate_id, user), &record);
    }

    #[test]
    fn it_should_return_cloned_otp_record_without_mutating_storage() {
        // Arrange
        let mut repo = TestRepositories::new().otp();
        let gate_id = random_id_string();
        let user = random_principal_id();
        let record = fixture_of_otp_record("123456", 600_000_000_000, 0);
        repo.set_otp_record(&gate_id, user, record.clone());

        // Act
        let mut retrieved = repo
            .get_otp_record(&gate_id, user)
            .expect("OTP record should exist");
        retrieved.code = "999999".to_string();
        retrieved.attempts = 9;

        // Assert
        assert_otp_record_eq(repo.get_otp_record(&gate_id, user), &record);
    }
}
