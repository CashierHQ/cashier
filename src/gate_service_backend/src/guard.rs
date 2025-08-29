use candid::Principal;
use ic_cdk::api::msg_caller;

static ANONYMOUS: Principal = Principal::anonymous();

/// The guard function to ensure the caller is not anonymous.
pub fn is_not_anonymous() -> Result<(), String> {
    if msg_caller() == ANONYMOUS {
        return Err("Anonymous caller is not allowed".to_string());
    }
    Ok(())
}
