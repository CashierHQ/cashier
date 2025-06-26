use cashier_macros::storable;

use crate::RequestLockKey;

#[derive(Debug, Clone)]
#[storable]
pub struct RequestLock {
    pub key: RequestLockKey,
    pub timestamp: u64,
}

impl RequestLock {
    /// Create a new RequestLock with the given key and current timestamp
    pub fn new(key: RequestLockKey, timestamp: u64) -> Self {
        Self { key, timestamp }
    }

    /// Get the string representation of the lock key
    pub fn key_string(&self) -> String {
        self.key.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_lock_key_to_string() {
        let key1 = RequestLockKey::user_link_action("user123", "link456", "action789");
        assert_eq!(
            key1.to_string(),
            "USER#user123#LINK#link456#ACTION#action789"
        );

        let key2 = RequestLockKey::user_link("user123", "link456");
        assert_eq!(key2.to_string(), "USER#user123#LINK#link456");

        let key3 = RequestLockKey::user_action_transaction("user123", "action789", "tx101");
        assert_eq!(
            key3.to_string(),
            "USER#user123#ACTION#action789#TRANSACTION#tx101"
        );
    }
}
