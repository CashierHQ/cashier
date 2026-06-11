// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{action::v1::ActionType, link_reservation::LinkReservation},
};
use log::info;

use crate::repositories::{Repositories, link_reservation::LinkReservationRepository};

/// RAII guard for a non-blocking, TTL-leased reservation of one link "use"
/// (IC `CallerGuard` pattern, see
/// <https://docs.internetcomputer.org/guides/security/inter-canister-calls/>).
///
/// Caps in-flight + committed actions on a link at `max_use` so concurrent claims cannot
/// over-claim shared link state. This is concurrency-control state only; committed uses
/// live in `link.use_count` (single source of truth) and a reservation is held only for
/// the duration of one `process_action` message.
///
/// Reserves in [`LinkReservationGuard::reserve`]; releases in `Drop` (idempotent), which
/// the IC runtime runs via `ic0.call_on_cleanup` even if the callback traps after an
/// `.await` (Rust CDK >= 0.5.1). `RESERVATION_TTL_NS` remains the backstop for the rare
/// case cleanup itself traps.
///
/// It does NOT replace [`RequestLockGuard`](crate::apps::request_lock::RequestLockGuard):
/// the reservation is idempotent on `action_id` (a retry refreshes its own slot), so it
/// cannot reject a concurrent duplicate of the same request — that anti-spam job stays
/// with the lock. For the same reason, two live guards for the same `action_id` would
/// free the shared slot on the first drop; this is unreachable in practice because the
/// request lock layer rejects concurrent duplicates first.
///
/// WARNING: bind the guard to a named variable (`let _guard = ...`). `let _ = ...`
/// drops it immediately, releasing the reservation before the awaited call runs.
#[must_use = "dropping this guard immediately releases the reservation; bind it to a named variable"]
pub struct LinkReservationGuard<R: Repositories> {
    repository: LinkReservationRepository<R::LinkReservation>,
    link_id: String,
    action_id: String,
}

impl<R: Repositories> LinkReservationGuard<R> {
    /// Whether an action type consumes one of the link's `max_use` slots.
    fn consumes_use(action_type: &ActionType) -> bool {
        matches!(action_type, ActionType::Receive | ActionType::Send)
    }

    /// Reserve one use of `link_id` for `action_id` of `action_type`.
    ///
    /// SYNCHRONOUS (no `.await`) so it is atomic per IC message. Idempotent per
    /// `action_id`: a retry of the same action refreshes its reservation instead of
    /// taking a second slot. Expired reservations (older than `ttl`) are evicted first,
    /// self-healing leaks.
    ///
    /// Returns `Err` if the link has no free use for this `action_type`.
    #[allow(clippy::too_many_arguments)]
    pub fn reserve(
        repo: &R,
        link_id: &str,
        action_id: &str,
        action_type: ActionType,
        max_use: u64,
        use_count: u64,
        now: u64,
        ttl: u64,
    ) -> Result<Self, CanisterError> {
        let mut repository = repo.link_reservation();

        // Drop expired reservations (backstop for claims that trapped before releasing).
        let mut live: Vec<LinkReservation> = repository
            .get(link_id)
            .into_iter()
            .filter(|r| now.saturating_sub(r.timestamp) < ttl)
            .collect();

        let guard = |repository| Self {
            repository,
            link_id: link_id.to_string(),
            action_id: action_id.to_string(),
        };

        // Idempotent retry: refresh our own reservation, do not consume another slot.
        if let Some(existing) = live.iter_mut().find(|r| r.id == action_id) {
            existing.timestamp = now;
            repository.put(link_id, live);
            return Ok(guard(repository));
        }

        // use_count is the source-of-truth for committed uses;
        // live.len() is the count of in-flight uses
        let is_max_use_reached = if Self::consumes_use(&action_type) {
            let live_uses = live
                .iter()
                .filter(|r| Self::consumes_use(&r.action_type))
                .count() as u64;
            use_count.saturating_add(live_uses) >= max_use
        } else {
            // non-use-consuming actions are not bounded by max_use
            false
        };

        if is_max_use_reached {
            if live.is_empty() {
                repository.remove(link_id);
            } else {
                repository.put(link_id, live);
            }
            return Err(CanisterError::LinkNoUseAvailable {
                link_id: link_id.to_string(),
            });
        }

        live.push(LinkReservation::new(
            action_id.to_string(),
            action_type,
            now,
        ));
        repository.put(link_id, live);

        info!(
            "Reserved use for link {} action {} (max_use {}, use_count {})",
            link_id, action_id, max_use, use_count
        );

        Ok(guard(repository))
    }
}

impl<R: Repositories> Drop for LinkReservationGuard<R> {
    fn drop(&mut self) {
        // Idempotent + infallible; must stay panic-free and call-free (cleanup context).
        // Removes the link key entirely when no reservations remain.
        let remaining: Vec<LinkReservation> = self
            .repository
            .get(&self.link_id)
            .into_iter()
            .filter(|r| r.id != self.action_id)
            .collect();

        if remaining.is_empty() {
            self.repository.remove(&self.link_id);
        } else {
            self.repository.put(&self.link_id, remaining);
        }

        info!(
            "Released reservation for link {} action {}",
            self.link_id, self.action_id
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::tests::TestRepositories;
    use cashier_common::test_utils::random_id_string;

    const NOW: u64 = 1_000_000;
    const TTL: u64 = 1_000;

    fn reserve(
        repos: &TestRepositories,
        link: &str,
        action_id: &str,
        action_type: ActionType,
        max_use: u64,
        use_count: u64,
        now: u64,
    ) -> Result<LinkReservationGuard<TestRepositories>, CanisterError> {
        LinkReservationGuard::reserve(
            repos,
            link,
            action_id,
            action_type,
            max_use,
            use_count,
            now,
            TTL,
        )
    }

    /// max_use = 1, use_count = 0 → exactly one free slot on "link1".
    fn reserve_one(
        repos: &TestRepositories,
        action_id: &str,
        now: u64,
    ) -> Result<LinkReservationGuard<TestRepositories>, CanisterError> {
        reserve(repos, "link1", action_id, ActionType::Receive, 1, 0, now)
    }

    #[test]
    fn it_should_release_reservation_when_guard_goes_out_of_scope() {
        let repos = TestRepositories::new();

        {
            let _guard = reserve_one(&repos, "a1", NOW).expect("reserve free slot");
            // Capacity exhausted while the guard is alive.
            assert!(reserve_one(&repos, "a2", NOW).is_err());
        }

        // Slot freed by Drop.
        let _guard2 = reserve_one(&repos, "a2", NOW).expect("slot freed after drop");
    }

    #[test]
    fn it_should_not_leak_when_reserve_fails_at_capacity() {
        let repos = TestRepositories::new();

        let guard = reserve_one(&repos, "a1", NOW).expect("reserve free slot");
        assert!(reserve_one(&repos, "a2", NOW).is_err());
        drop(guard);

        // The failed attempt left nothing behind; the single slot is reusable.
        let _guard2 = reserve_one(&repos, "a2", NOW).expect("slot free again");
    }

    #[test]
    fn it_should_refresh_same_action_id_without_consuming_second_slot() {
        let repos = TestRepositories::new();

        let guard1 = reserve_one(&repos, "a1", NOW).expect("reserve free slot");
        // Idempotent retry for the same action refreshes instead of failing at capacity.
        let guard2 = reserve_one(&repos, "a1", NOW + 1).expect("idempotent retry");
        // A different action is still rejected (the single slot is held by a1).
        assert!(reserve_one(&repos, "a2", NOW + 1).is_err());

        // Documented limitation: first drop of either guard frees the shared slot.
        drop(guard2);
        let guard3 = reserve_one(&repos, "a2", NOW + 2).expect("slot freed by first drop");

        // Second drop (guard1, "a1" already gone) is an idempotent no-op: guard3's slot stays held.
        drop(guard1);
        assert!(reserve_one(&repos, "a4", NOW + 3).is_err());
        drop(guard3);
    }

    #[test]
    fn it_should_release_reservation_when_holder_panics() {
        let repos = TestRepositories::new();

        // Simulates Drop-on-trap: on the IC, call_on_cleanup unwinds local vars the same way.
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = reserve_one(&repos, "a1", NOW).expect("reserve free slot");
            panic!("simulated trap after await");
        }));

        assert!(result.is_err());
        let _guard2 = reserve_one(&repos, "a2", NOW).expect("slot freed after panic");
    }

    #[test]
    fn it_should_reserve_up_to_max_use_then_reject() {
        let repos = TestRepositories::new();
        let link = random_id_string();

        // max_use = 2, use_count = 0 → two Receive claims fit, third rejected.
        let _g1 = reserve(&repos, &link, "a1", ActionType::Receive, 2, 0, NOW).expect("first");
        let _g2 = reserve(&repos, &link, "a2", ActionType::Receive, 2, 0, NOW).expect("second");
        let third = reserve(&repos, &link, "a3", ActionType::Receive, 2, 0, NOW);
        assert!(matches!(
            third,
            Err(CanisterError::LinkNoUseAvailable { .. })
        ));
    }

    #[test]
    fn it_should_evict_expired_reservation_and_allow_new() {
        let repos = TestRepositories::new();
        let link = random_id_string();

        // max_use = 1, slot held by a1 at t=NOW; guard kept alive (simulates a leak).
        let _g1 = reserve(&repos, &link, "a1", ActionType::Receive, 1, 0, NOW).expect("a1");

        // At t=NOW+TTL a1 is expired → a2 can reserve despite the live guard.
        let _g2 = reserve(&repos, &link, "a2", ActionType::Receive, 1, 0, NOW + TTL)
            .expect("expired a1 evicted");
    }

    #[test]
    fn it_should_reject_when_use_count_already_at_max() {
        let repos = TestRepositories::new();
        let link = random_id_string();

        // use_count already == max_use (link fully claimed) → reject.
        let res = reserve(&repos, &link, "a1", ActionType::Receive, 1, 1, NOW);
        assert!(matches!(res, Err(CanisterError::LinkNoUseAvailable { .. })));
    }

    #[test]
    fn it_should_reject_when_max_use_is_zero() {
        // Degenerate link with no uses → every claim rejected (reject path with empty live).
        let repos = TestRepositories::new();
        let link = random_id_string();

        let res = reserve(&repos, &link, "a1", ActionType::Receive, 0, 0, NOW);
        assert!(matches!(res, Err(CanisterError::LinkNoUseAvailable { .. })));
        // A second attempt still rejects (no stale state corrupting admission).
        assert!(reserve(&repos, &link, "a2", ActionType::Receive, 0, 0, NOW).is_err());
    }

    #[test]
    fn it_should_not_let_non_use_reservation_consume_a_claim_slot() {
        let repos = TestRepositories::new();
        let link = random_id_string();

        // A Withdraw reservation exists (does not consume a use). max_use = 1.
        let _w1 = reserve(&repos, &link, "w1", ActionType::Withdraw, 1, 0, NOW).expect("withdraw");

        // A Receive claim still fits — the Withdraw didn't eat the use slot.
        let _a1 = reserve(&repos, &link, "a1", ActionType::Receive, 1, 0, NOW).expect("receive");
    }
}
