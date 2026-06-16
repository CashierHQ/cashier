// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_backend_types::{
    error::CanisterError,
    repository::{action::v1::ActionType, link_reservation::LinkReservation},
};
use log::info;

use crate::{
    apps::link_v3::service::LinkV3Service,
    repositories::{Repositories, link_reservation::LinkReservationRepository},
};

/// RAII guard for a reservation of one use of a link for the duration of an IC message (until the end of the call or a trap).
pub struct LinkReservationGuard<R: Repositories> {
    repository: LinkReservationRepository<R::LinkReservation>,
    link_id: String,
    action_id: String,
}

impl<R: Repositories> LinkReservationGuard<R> {
    /// Determines if the given action type consumes a use of the link, which affects whether it counts against max_use limits.
    /// # Arguments
    /// * `action_type` - The type of action to check.
    /// # Returns
    /// `true` if the action type consumes a use of the link (e.g., Receive or Send), or `false` if it does not (e.g., Withdraw).
    fn consumes_use(action_type: &ActionType) -> bool {
        matches!(action_type, ActionType::Receive | ActionType::Send)
    }

    /// Attempts to reserve one use of the link for the given action
    /// # Arguments
    /// * `repo` - The repositories instance to access link reservations
    /// * `action_id` - The ID of the action for which to reserve the link
    /// * `now` - The current timestamp (for eviction of expired reservations)
    /// * `ttl` - The time-to-live for a reservation before it is considered expired
    /// * `link_service` - Service to fetch link data (to check max_use and use_count)
    /// # Returns
    /// * `Ok(LinkReservationGuard)` if the reservation was successful
    /// * `Err(CanisterError::LinkNoUseAvailable)` if the link has no available uses (considering both committed use_count and in-flight reservations)
    #[allow(clippy::too_many_arguments)]
    pub fn reserve(
        repo: &R,
        action_id: &str,
        now: u64,
        ttl: u64,
        link_service: &LinkV3Service<R>,
    ) -> Result<Self, CanisterError> {
        let mut repository = repo.link_reservation();

        let action_data = link_service
            .action_service
            .get_action_data(action_id)
            .map_err(|_| CanisterError::NotFound("Action not found".to_string()))?;
        let link_id = &action_data.action.link_id;
        let link = link_service.get_link(link_id)?;

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
        let is_max_use_reached = if Self::consumes_use(&action_data.action.action_type) {
            let live_uses = live
                .iter()
                .filter(|r| Self::consumes_use(&r.action_type))
                .count() as u64;
            link.use_count.saturating_add(live_uses) >= link.max_use
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
            action_data.action.action_type,
            now,
        ));
        repository.put(link_id, live);

        info!(
            "Reserved use for link {} action {} (max_use {}, use_count {})",
            link_id, action_id, link.max_use, link.use_count
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
    use cashier_backend_types::repository::{
        action::v1::ActionState,
        action::v3::ActionV3,
        common::AddressTypeV3,
        link::v1::LinkType,
        link::v3::{LinkState, LinkV3},
    };
    use cashier_common::test_utils::{random_id_string, random_principal_id};

    const NOW: u64 = 1_000_000;
    const TTL: u64 = 1_000;

    /// Seed a link so `LinkV3Service::get_link` resolves `max_use`/`use_count`.
    fn seed_link(repos: &TestRepositories, link_id: &str, max_use: u64, use_count: u64) {
        repos.link_v3().create(LinkV3 {
            id: link_id.to_string(),
            title: "test-link".to_string(),
            link_type: LinkType::SendTip,
            asset_info: vec![],
            max_use,
            use_count,
            creator: random_principal_id(),
            state: LinkState::Active,
            created_at: NOW,
        });
    }

    /// Seed an action so `get_action_data` resolves `link_id`/`action_type` (no intents needed).
    fn seed_action(
        repos: &TestRepositories,
        action_id: &str,
        link_id: &str,
        action_type: ActionType,
    ) {
        repos.action_v3().create(ActionV3 {
            id: action_id.to_string(),
            action_type,
            state: ActionState::Created,
            creator: random_principal_id(),
            creator_address_type: AddressTypeV3::User,
            link_id: link_id.to_string(),
            intent_ids: vec![],
        });
    }

    fn reserve(
        repos: &TestRepositories,
        link: &str,
        action_id: &str,
        action_type: ActionType,
        max_use: u64,
        use_count: u64,
        now: u64,
    ) -> Result<LinkReservationGuard<TestRepositories>, CanisterError> {
        // `reserve` now resolves link/action context through the service, so the
        // backing records must exist first.
        seed_link(repos, link, max_use, use_count);
        seed_action(repos, action_id, link, action_type);
        let link_service = LinkV3Service::new(repos);
        LinkReservationGuard::reserve(repos, action_id, now, TTL, &link_service)
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
        // Arrange: a link with a single free slot.
        let repos = TestRepositories::new();

        // Act + Assert: the slot is held while the guard is alive, so a second
        // claim is rejected; once the guard scope ends, Drop frees the slot.
        {
            let _guard = reserve_one(&repos, "a1", NOW).expect("reserve free slot");
            assert!(reserve_one(&repos, "a2", NOW).is_err());
        }

        // Assert: slot freed by Drop, so a new claim now succeeds.
        let _guard2 = reserve_one(&repos, "a2", NOW).expect("slot freed after drop");
    }

    #[test]
    fn it_should_not_leak_when_reserve_fails_at_capacity() {
        // Arrange: a link with a single free slot, already held by a1.
        let repos = TestRepositories::new();
        let guard = reserve_one(&repos, "a1", NOW).expect("reserve free slot");

        // Act: a second claim fails at capacity, then a1 is released.
        assert!(reserve_one(&repos, "a2", NOW).is_err());
        drop(guard);

        // Assert: the failed attempt left nothing behind; the slot is reusable.
        let _guard2 = reserve_one(&repos, "a2", NOW).expect("slot free again");
    }

    #[test]
    fn it_should_refresh_same_action_id_without_consuming_second_slot() {
        // Arrange: a link with a single free slot, held by a1.
        let repos = TestRepositories::new();
        let guard1 = reserve_one(&repos, "a1", NOW).expect("reserve free slot");

        // Act: an idempotent retry of a1 refreshes its slot instead of taking a second.
        let guard2 = reserve_one(&repos, "a1", NOW + 1).expect("idempotent retry");

        // Assert: a different action is still rejected (slot held by a1).
        assert!(reserve_one(&repos, "a2", NOW + 1).is_err());

        // Act + Assert: documented limitation — first drop of either a1 guard frees
        // the shared slot, so a2 can then reserve.
        drop(guard2);
        let guard3 = reserve_one(&repos, "a2", NOW + 2).expect("slot freed by first drop");

        // Act + Assert: second drop (guard1, a1 already gone) is an idempotent no-op,
        // so guard3's slot stays held and a4 is rejected.
        drop(guard1);
        assert!(reserve_one(&repos, "a4", NOW + 3).is_err());
        drop(guard3);
    }

    #[test]
    fn it_should_release_reservation_when_holder_panics() {
        // Arrange: a link with a single free slot.
        let repos = TestRepositories::new();

        // Act: hold the slot, then panic — simulates Drop-on-trap, since on the IC
        // call_on_cleanup unwinds local vars the same way.
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = reserve_one(&repos, "a1", NOW).expect("reserve free slot");
            panic!("simulated trap after await");
        }));

        // Assert: the panic unwound and Drop freed the slot for a new claim.
        assert!(result.is_err());
        let _guard2 = reserve_one(&repos, "a2", NOW).expect("slot freed after panic");
    }

    #[test]
    fn it_should_reserve_up_to_max_use_then_reject() {
        // Arrange: a link with max_use = 2, use_count = 0 (two Receive claims fit).
        let repos = TestRepositories::new();
        let link = random_id_string();

        // Act: two claims fill capacity; a third is attempted.
        let _g1 = reserve(&repos, &link, "a1", ActionType::Receive, 2, 0, NOW).expect("first");
        let _g2 = reserve(&repos, &link, "a2", ActionType::Receive, 2, 0, NOW).expect("second");
        let third = reserve(&repos, &link, "a3", ActionType::Receive, 2, 0, NOW);

        // Assert: the third claim is rejected for lack of an available use.
        assert!(matches!(
            third,
            Err(CanisterError::LinkNoUseAvailable { .. })
        ));
    }

    #[test]
    fn it_should_evict_expired_reservation_and_allow_new() {
        // Arrange: max_use = 1, slot held by a1 at t=NOW; guard kept alive (simulates a leak).
        let repos = TestRepositories::new();
        let link = random_id_string();
        let _g1 = reserve(&repos, &link, "a1", ActionType::Receive, 1, 0, NOW).expect("a1");

        // Act: a2 claims at t=NOW+TTL, when a1's reservation is expired.
        let g2 = reserve(&repos, &link, "a2", ActionType::Receive, 1, 0, NOW + TTL);

        // Assert: expired a1 is evicted, so a2 reserves despite the live guard.
        assert!(g2.is_ok(), "expired a1 should be evicted");
    }

    #[test]
    fn it_should_reject_when_use_count_already_at_max() {
        // Arrange: a link already fully claimed (use_count == max_use).
        let repos = TestRepositories::new();
        let link = random_id_string();

        // Act: attempt a new reservation.
        let res = reserve(&repos, &link, "a1", ActionType::Receive, 1, 1, NOW);

        // Assert: rejected for lack of an available use.
        assert!(matches!(res, Err(CanisterError::LinkNoUseAvailable { .. })));
    }

    #[test]
    fn it_should_reject_when_max_use_is_zero() {
        // Arrange: a degenerate link with no uses (max_use = 0).
        let repos = TestRepositories::new();
        let link = random_id_string();

        // Act: two reservation attempts.
        let first = reserve(&repos, &link, "a1", ActionType::Receive, 0, 0, NOW);
        let second = reserve(&repos, &link, "a2", ActionType::Receive, 0, 0, NOW);

        // Assert: every claim is rejected; no stale state corrupts admission.
        assert!(matches!(
            first,
            Err(CanisterError::LinkNoUseAvailable { .. })
        ));
        assert!(second.is_err());
    }

    #[test]
    fn it_should_not_let_non_use_reservation_consume_a_claim_slot() {
        // Arrange: max_use = 1, with a live Withdraw reservation (does not consume a use).
        let repos = TestRepositories::new();
        let link = random_id_string();
        let _w1 = reserve(&repos, &link, "w1", ActionType::Withdraw, 1, 0, NOW).expect("withdraw");

        // Act: a Receive claim on the same link.
        let a1 = reserve(&repos, &link, "a1", ActionType::Receive, 1, 0, NOW);

        // Assert: the Receive still fits — the Withdraw didn't eat the use slot.
        assert!(a1.is_ok(), "withdraw must not consume a claim slot");
    }

    #[test]
    fn it_should_fail_to_reserve_when_action_not_found() {
        // Arrange: no action (and no link) seeded, so context resolution must fail.
        let repos = TestRepositories::new();
        let link_service = LinkV3Service::new(&repos);

        // Act: reserve for an unknown action id.
        let result =
            LinkReservationGuard::reserve(&repos, "missing-action", NOW, TTL, &link_service);

        // Assert: the missing action is reported as NotFound; nothing is reserved.
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[test]
    fn it_should_fail_to_reserve_when_link_not_found() {
        // Arrange: an action that points at a link which was never seeded.
        let repos = TestRepositories::new();
        seed_action(&repos, "a1", "ghost-link", ActionType::Receive);
        let link_service = LinkV3Service::new(&repos);

        // Act: reserve for the action whose link is missing.
        let result = LinkReservationGuard::reserve(&repos, "a1", NOW, TTL, &link_service);

        // Assert: the missing link is reported as NotFound.
        assert!(matches!(result, Err(CanisterError::NotFound(_))));
    }

    #[test]
    fn it_should_allow_non_use_reservation_on_a_fully_claimed_link() {
        // Arrange: a link fully claimed (max_use = 1, use_count = 1) — no free use slot.
        let repos = TestRepositories::new();
        let link = random_id_string();

        // Act: a Withdraw reservation on the exhausted link.
        let withdraw = reserve(&repos, &link, "w1", ActionType::Withdraw, 1, 1, NOW);

        // Assert: Withdraw is not bounded by max_use, so it still reserves.
        assert!(
            withdraw.is_ok(),
            "non-use action must reserve even when the link is fully claimed"
        );
    }

    #[test]
    fn it_should_reserve_up_to_max_use_then_reject_for_send_actions() {
        // Arrange: a link with a single use slot (max_use = 1, use_count = 0).
        let repos = TestRepositories::new();
        let link = random_id_string();

        // Act: one Send claim fills capacity; a second Send is attempted.
        let _first = reserve(&repos, &link, "s1", ActionType::Send, 1, 0, NOW).expect("first send");
        let second = reserve(&repos, &link, "s2", ActionType::Send, 1, 0, NOW);

        // Assert: Send consumes a use like Receive, so the second is rejected.
        assert!(matches!(
            second,
            Err(CanisterError::LinkNoUseAvailable { .. })
        ));
    }
}
