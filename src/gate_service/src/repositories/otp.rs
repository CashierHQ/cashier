// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use crate::repositories::OTP_STORE;
use candid::Principal;
use gate_service_types::{GateUser, OtpRecord};

/// Retrieves a pending OTP record for the given gate and user, if one exists.
/// # Arguments
/// * `gate_id`: The ID of the gate.
/// * `user`: The principal of the user who requested the OTP.
/// # Returns
/// * `Some(OtpRecord)`: A pending (possibly expired) OTP record.
/// * `None`: No OTP has been sent for this gate/user pair.
pub fn get_otp_record(gate_id: &str, user: Principal) -> Option<OtpRecord> {
    let key = GateUser {
        gate_id: gate_id.to_string(),
        user_id: user,
    };
    OTP_STORE.with_borrow(|m| m.get(&key))
}

/// Stores an OTP record for the given gate and user, replacing any existing record.
/// # Arguments
/// * `gate_id`: The ID of the gate.
/// * `user`: The principal of the user who requested the OTP.
/// * `record`: The OTP record to store.
pub fn set_otp_record(gate_id: &str, user: Principal, record: OtpRecord) {
    let key = GateUser {
        gate_id: gate_id.to_string(),
        user_id: user,
    };
    OTP_STORE.with_borrow_mut(|m| m.insert(key, record));
}

/// Removes the OTP record for the given gate and user.
/// Called after successful verification or when the record is no longer needed.
/// # Arguments
/// * `gate_id`: The ID of the gate.
/// * `user`: The principal of the user whose OTP record should be removed.
pub fn delete_otp_record(gate_id: &str, user: Principal) {
    let key = GateUser {
        gate_id: gate_id.to_string(),
        user_id: user,
    };
    OTP_STORE.with_borrow_mut(|m| m.remove(&key));
}
