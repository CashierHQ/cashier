use cashier_macros::storable;

use crate::repository::keys::RequestLockKey;

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
    use candid::Principal;

    use crate::repository::keys::RequestLockKey;

    #[test]
    fn it_should_format_each_request_lock_key_variant_to_string() {
        // Arrange: one key per variant, all sharing the same user principal.
        let user = Principal::anonymous();
        let create_action = RequestLockKey::CreateAction {
            user_principal: user,
            link_id: "link456".to_string(),
            action_type: "action789".to_string(),
        };
        let create_link = RequestLockKey::CreateLink {
            user_principal: user,
        };
        let process_action = RequestLockKey::ProcessAction {
            user_principal: user,
            action_id: "action789".to_string(),
        };

        // Act: render each key to its string form.
        let create_action_str = create_action.to_string();
        let create_link_str = create_link.to_string();
        let process_action_str = process_action.to_string();

        // Assert: every variant maps to its expected delimited format.
        assert_eq!(
            create_action_str,
            format!(
                "CREATE_ACTION#USER#{}#LINK#link456#ACTION_TYPE#action789",
                user
            )
        );
        assert_eq!(create_link_str, format!("CREATE_LINK#USER#{}", user));
        assert_eq!(
            process_action_str,
            format!("PROCESS_ACTION#USER#{}#ACTION#action789", user)
        );
    }
}
