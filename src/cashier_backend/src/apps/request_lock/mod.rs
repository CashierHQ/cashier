// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{keys::RequestLockKey, request_lock::RequestLock},
};
use log::info;

use crate::repositories::{Repositories, request_lock::RequestLockRepository};

/// RAII guard for a request lock (IC `CallerGuard` pattern, see
/// <https://docs.internetcomputer.org/guides/security/inter-canister-calls/>).
///
/// Acquires the lock in [`RequestLockGuard::new`]; releases it in `Drop`, which the IC
/// runtime runs via `ic0.call_on_cleanup` even if the callback traps after an `.await`
/// (Rust CDK >= 0.5.1). Locks live in volatile heap storage, so a rare leak (e.g.
/// cleanup itself trapping) dies at the next canister upgrade instead of blocking
/// its key forever.
///
/// WARNING: bind the guard to a named variable (`let _guard = ...`). `let _ = ...`
/// drops it immediately, releasing the lock before the awaited call runs.
#[must_use = "dropping this guard immediately releases the lock; bind it to a named variable"]
pub struct RequestLockGuard<R: Repositories> {
    repository: RequestLockRepository<R::RequestLock>,
    key: RequestLockKey,
}

impl<R: Repositories> RequestLockGuard<R> {
    /// # Acquires a request lock for the given key and timestamp, returning a guard that holds it.
    /// ## Arguments
    /// * `repo` - A reference to the repositories instance used to access the request lock repository.
    /// * `key` - The key for which to acquire the request lock.
    /// * `timestamp` - The timestamp (in nanoseconds) at which the lock is being acquired.
    /// ## Returns
    /// * `Ok(RequestLockGuard)` if the lock was successfully acquired. The returned guard will hold the lock until it goes out of scope.
    /// * `Err(CanisterError)` if the lock could not be acquired because it already exists for the given key.
    pub fn new(repo: &R, key: RequestLockKey, timestamp: u64) -> Result<Self, CanisterError> {
        let mut repository = repo.request_lock();
        if repository.exists(&key) {
            return Err(CanisterError::ValidationErrors(format!(
                "Request lock already exists for key: {key:?}"
            )));
        }
        repository.create(RequestLock::new(key.clone(), timestamp));
        info!("Request lock acquired for key: {key:?}");
        Ok(Self { repository, key })
    }
}

impl<R: Repositories> Drop for RequestLockGuard<R> {
    fn drop(&mut self) {
        // Infallible; must stay panic-free and call-free (runs in cleanup context).
        self.repository.delete(&self.key);
        info!("Dropped request lock for key: {:?}", self.key);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::{Repositories, tests::TestRepositories};
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    const TS: u64 = 1_622_547_800;

    fn test_key() -> RequestLockKey {
        RequestLockKey::ProcessAction {
            user_principal: random_principal_id(),
            action_id: random_id_string(),
        }
    }

    #[test]
    fn it_should_release_lock_when_guard_goes_out_of_scope() {
        // Arrange: a fresh repository and an unlocked key.
        let repos = TestRepositories::new();
        let key = test_key();

        // Act + Assert: the lock is held while the guard is alive...
        {
            let _guard =
                RequestLockGuard::new(&repos, key.clone(), TS).expect("guard should acquire lock");
            assert!(repos.request_lock().exists(&key));
        }

        // Assert: ...and released once the guard scope ends (Drop).
        assert!(!repos.request_lock().exists(&key));
    }

    #[test]
    fn it_should_reject_second_guard_while_lock_is_held() {
        // Arrange: a key already locked by a live guard.
        let repos = TestRepositories::new();
        let key = test_key();
        let _guard = RequestLockGuard::new(&repos, key.clone(), TS).expect("first acquire");

        // Act: a concurrent duplicate tries to acquire the same key.
        let second = RequestLockGuard::new(&repos, key.clone(), TS);

        // Assert: the duplicate is rejected and the held lock is left intact.
        assert!(second.is_err());
        assert!(repos.request_lock().exists(&key));
    }

    #[test]
    fn it_should_allow_reacquire_after_guard_dropped() {
        // Arrange: a key locked once, then released.
        let repos = TestRepositories::new();
        let key = test_key();
        let guard = RequestLockGuard::new(&repos, key.clone(), TS).expect("first acquire");
        drop(guard);

        // Act: re-acquire the same key after the first guard was dropped.
        let _guard2 =
            RequestLockGuard::new(&repos, key.clone(), TS).expect("re-acquire after drop");

        // Assert: the lock is held again.
        assert!(repos.request_lock().exists(&key));
    }

    #[test]
    fn it_should_release_lock_when_holder_panics() {
        // Arrange: a fresh repository and an unlocked key.
        let repos = TestRepositories::new();
        let key = test_key();

        // Act: hold the lock, then panic — simulates Drop-on-trap, since on the IC
        // call_on_cleanup unwinds local vars the same way.
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = RequestLockGuard::new(&repos, key.clone(), TS).expect("acquire");
            panic!("simulated trap after await");
        }));

        // Assert: the panic unwound and Drop released the lock.
        assert!(result.is_err());
        assert!(!repos.request_lock().exists(&key));
    }
}
