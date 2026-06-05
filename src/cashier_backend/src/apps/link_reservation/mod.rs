// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{action::v1::ActionType, link_reservation::LinkReservation},
};
use log::info;

use crate::repositories::{Repositories, link_reservation::LinkReservationRepository};

/// Non-blocking, TTL-leased reservation of link "uses".
///
/// Caps the number of in-flight + committed actions on a link at `max_use` so concurrent
/// claims cannot over-claim / race shared link state. This is concurrency-control state only;
/// committed uses live in `link.use_count` (single source of truth) and a reservation is held
/// only for the duration of one `process_action` message.
///
/// It does NOT replace [`RequestLockService`](crate::apps::request_lock::RequestLockService):
/// the reservation is idempotent on `action_id` (a retry refreshes its own slot), so it cannot
/// reject a concurrent duplicate of the same request — that anti-spam job stays with the lock.
pub struct LinkReservationService<R: Repositories> {
    link_reservation_repository: LinkReservationRepository<R::LinkReservation>,
}

impl<R: Repositories> LinkReservationService<R> {
    pub fn new(repo: &R) -> Self {
        Self {
            link_reservation_repository: repo.link_reservation(),
        }
    }

    /// Whether an action type consumes one of the link's `max_use` slots.
    fn consumes_use(action_type: &ActionType) -> bool {
        matches!(action_type, ActionType::Receive | ActionType::Send)
    }

    /// Reserve one use of `link_id` for `action_id` of `action_type`.
    ///
    /// SYNCHRONOUS (no `.await`) so it is atomic per IC message. Idempotent per `action_id`:
    /// a retry of the same action refreshes its reservation instead of taking a second slot.
    /// Expired reservations (older than `ttl`) are evicted first, self-healing leaks.
    ///
    /// Returns `Err` if the link has no free use for this `action_type`.
    pub fn reserve(
        &mut self,
        link_id: &str,
        action_id: &str,
        action_type: ActionType,
        max_use: u64,
        use_count: u64,
        now: u64,
        ttl: u64,
    ) -> Result<(), CanisterError> {
        // Drop expired reservations (backstop for claims that trapped before releasing).
        let mut live: Vec<LinkReservation> = self
            .link_reservation_repository
            .get(link_id)
            .into_iter()
            .filter(|r| now.saturating_sub(r.timestamp) < ttl)
            .collect();

        // Idempotent retry: refresh our own reservation, do not consume another slot.
        if let Some(existing) = live.iter_mut().find(|r| r.id == action_id) {
            existing.timestamp = now;
            self.link_reservation_repository.put(link_id, live);
            return Ok(());
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
                self.link_reservation_repository.remove(link_id);
            } else {
                self.link_reservation_repository.put(link_id, live);
            }
            return Err(CanisterError::ValidationErrors(format!(
                "No free use available for link {link_id} (max_use reached or other claims in flight)"
            )));
        }

        live.push(LinkReservation::new(action_id.to_string(), action_type, now));
        self.link_reservation_repository.put(link_id, live);

        info!(
            "Reserved use for link {} action {} (max_use {}, use_count {})",
            link_id, action_id, max_use, use_count
        );

        Ok(())
    }

    /// Release the reservation held by `action_id` (call on success AND failure).
    ///
    /// Idempotent: releasing an unknown / already-gone id is a no-op. Removes the link key
    /// entirely when no reservations remain (so empty keys are not left behind).
    pub fn release(&mut self, link_id: &str, action_id: &str) {
        let remaining: Vec<LinkReservation> = self
            .link_reservation_repository
            .get(link_id)
            .into_iter()
            .filter(|r| r.id != action_id)
            .collect();

        if remaining.is_empty() {
            self.link_reservation_repository.remove(link_id);
        } else {
            self.link_reservation_repository.put(link_id, remaining);
        }

        info!(
            "Released reservation for link {} action {}",
            link_id, action_id
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::tests::TestRepositories;
    use cashier_common::test_utils::random_id_string;

    const TTL: u64 = 1_000;

    fn service() -> LinkReservationService<TestRepositories> {
        LinkReservationService::new(&TestRepositories::new())
    }

    #[test]
    fn it_should_reserve_up_to_max_use_then_reject() {
        // Arrange
        let mut svc = service();
        let link = random_id_string();

        // Act + Assert: max_use = 2, use_count = 0 → two Receive claims fit, third rejected
        assert!(
            svc.reserve(&link, "a1", ActionType::Receive, 2, 0, 100, TTL)
                .is_ok()
        );
        assert!(
            svc.reserve(&link, "a2", ActionType::Receive, 2, 0, 100, TTL)
                .is_ok()
        );
        let third = svc.reserve(&link, "a3", ActionType::Receive, 2, 0, 100, TTL);
        assert!(matches!(third, Err(CanisterError::ValidationErrors(_))));
    }

    #[test]
    fn it_should_be_idempotent_on_same_action_id() {
        // Arrange
        let mut svc = service();
        let link = random_id_string();

        // Act: same action reserved twice on a max_use = 1 link
        assert!(
            svc.reserve(&link, "a1", ActionType::Receive, 1, 0, 100, TTL)
                .is_ok()
        );
        assert!(
            svc.reserve(&link, "a1", ActionType::Receive, 1, 0, 150, TTL)
                .is_ok(),
            "retry of same action must refresh, not consume a second slot"
        );

        // Assert: a different action is now rejected (the single slot is held by a1)
        let other = svc.reserve(&link, "a2", ActionType::Receive, 1, 0, 150, TTL);
        assert!(other.is_err());
    }

    #[test]
    fn it_should_evict_expired_reservation_and_allow_new() {
        // Arrange: max_use = 1, slot held by a1 at t=100
        let mut svc = service();
        let link = random_id_string();
        assert!(
            svc.reserve(&link, "a1", ActionType::Receive, 1, 0, 100, TTL)
                .is_ok()
        );

        // Act + Assert: at t=100+TTL a1 is expired → a2 can reserve
        let now = 100 + TTL;
        assert!(
            svc.reserve(&link, "a2", ActionType::Receive, 1, 0, now, TTL)
                .is_ok()
        );
    }

    #[test]
    fn it_should_free_slot_on_release() {
        // Arrange: max_use = 1, slot held by a1
        let mut svc = service();
        let link = random_id_string();
        assert!(
            svc.reserve(&link, "a1", ActionType::Receive, 1, 0, 100, TTL)
                .is_ok()
        );
        assert!(
            svc.reserve(&link, "a2", ActionType::Receive, 1, 0, 100, TTL)
                .is_err()
        );

        // Act
        svc.release(&link, "a1");

        // Assert: slot is free again
        assert!(
            svc.reserve(&link, "a2", ActionType::Receive, 1, 0, 100, TTL)
                .is_ok()
        );
    }

    #[test]
    fn it_should_release_unknown_id_as_noop() {
        let mut svc = service();
        let link = random_id_string();
        // Should not panic / error
        svc.release(&link, "does-not-exist");
        assert!(
            svc.reserve(&link, "a1", ActionType::Receive, 1, 0, 100, TTL)
                .is_ok()
        );
    }

    #[test]
    fn it_should_reject_when_use_count_already_at_max() {
        // Arrange: use_count already == max_use (link fully claimed)
        let mut svc = service();
        let link = random_id_string();

        // Act
        let res = svc.reserve(&link, "a1", ActionType::Receive, 1, 1, 100, TTL);

        // Assert
        assert!(matches!(res, Err(CanisterError::ValidationErrors(_))));
    }

    #[test]
    fn it_should_reject_when_max_use_is_zero() {
        // Degenerate link with no uses → every claim rejected (reject path with empty live).
        let mut svc = service();
        let link = random_id_string();
        let res = svc.reserve(&link, "a1", ActionType::Receive, 0, 0, 100, TTL);
        assert!(matches!(res, Err(CanisterError::ValidationErrors(_))));
        // A second attempt still rejects (no stale state corrupting admission).
        let res2 = svc.reserve(&link, "a2", ActionType::Receive, 0, 0, 100, TTL);
        assert!(res2.is_err());
    }

    #[test]
    fn it_should_not_let_non_use_reservation_consume_a_claim_slot() {
        // Arrange: a Withdraw reservation exists (does not consume a use). max_use = 1.
        let mut svc = service();
        let link = random_id_string();
        assert!(
            svc.reserve(&link, "w1", ActionType::Withdraw, 1, 0, 100, TTL)
                .is_ok()
        );

        // Act + Assert: a Receive claim still fits — the Withdraw didn't eat the use slot
        assert!(
            svc.reserve(&link, "a1", ActionType::Receive, 1, 0, 100, TTL)
                .is_ok()
        );
    }
}
