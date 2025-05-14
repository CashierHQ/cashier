use super::error::CanisterError;

// Add this to the error.rs file
pub type CanisterResult<T> = Result<T, CanisterError>;
