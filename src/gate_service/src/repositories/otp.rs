// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::{OTP_STORE, OtpStorage};
use candid::Principal;
use gate_service_types::{GateUser, OtpRecord};
use ic_mple_log::service::Storage;

/// Repository for managing OTP records backed by a stable `OtpStorage` map.
pub struct OtpRepository<S: Storage<OtpStorage>> {
    store: S,
}

impl<S: Storage<OtpStorage>> OtpRepository<S> {
    /// Creates a new `OtpRepository` backed by the provided stable-memory store.
    /// # Arguments
    /// * `store`: Stable store mapping `(gate_id, user)` pairs to `OtpRecord` values.
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
        self.store.with_borrow(|m| m.get(&key))
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

/// Retrieves a pending OTP record from the canister's thread-local OTP store.
pub fn get_otp_record(gate_id: &str, user: Principal) -> Option<OtpRecord> {
    OtpRepository::new(&OTP_STORE).get_otp_record(gate_id, user)
}

/// Stores an OTP record in the canister's thread-local OTP store.
pub fn set_otp_record(gate_id: &str, user: Principal, record: OtpRecord) {
    OtpRepository::new(&OTP_STORE).set_otp_record(gate_id, user, record);
}

/// Removes an OTP record from the canister's thread-local OTP store.
pub fn delete_otp_record(gate_id: &str, user: Principal) {
    OtpRepository::new(&OTP_STORE).delete_otp_record(gate_id, user);
}
