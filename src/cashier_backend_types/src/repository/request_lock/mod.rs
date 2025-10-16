use cashier_macros::storable;
use ic_mple_structures::Codec;

use crate::repository::keys::RequestLockKey;

#[derive(Debug, Clone)]
#[storable]
pub struct RequestLock {
    pub key: RequestLockKey,
    pub timestamp: u64,
}

#[storable]
pub enum RequestLockCodec {
    V1(RequestLock),
}

impl Codec<RequestLock> for RequestLockCodec {
    fn decode(source: Self) -> RequestLock {
        match source {
            RequestLockCodec::V1(link) => link,
        }
    }

    fn encode(dest: RequestLock) -> Self {
        RequestLockCodec::V1(dest)
    }
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
    use candid::Principal;

    use crate::repository::keys::RequestLockKey;

    #[test]
    fn test_request_lock_key_to_string() {
        let user = Principal::anonymous();
        let key1 = RequestLockKey::user_link_action(user, "link456", "action789");
        assert_eq!(
            key1.to_string(),
            format!("USER#{}#LINK#link456#ACTION#action789", user)
        );

        let key2 = RequestLockKey::user_link(user, "link456");
        assert_eq!(key2.to_string(), format!("USER#{}#LINK#link456", user));

        let key3 = RequestLockKey::user_action_transaction(user, "action789", "tx101");
        assert_eq!(
            key3.to_string(),
            format!("USER#{}#ACTION#action789#TRANSACTION#tx101", user)
        );
    }
}
