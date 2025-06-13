// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

use crate::repositories::{
    ACTION_INTENT_STORE, ACTION_STORE, INTENT_STORE, INTENT_TRANSACTION_STORE, LINK_ACTION_STORE,
    LINK_STORE, TRANSACTION_STORE, USER_ACTION_STORE, USER_LINK_STORE, USER_STORE,
    USER_WALLET_STORE, VERSIONED_ACTION_INTENT_STORE, VERSIONED_ACTION_STORE,
    VERSIONED_INTENT_STORE, VERSIONED_INTENT_TRANSACTION_STORE, VERSIONED_LINK_ACTION_STORE,
    VERSIONED_LINK_STORE, VERSIONED_TRANSACTION_STORE, VERSIONED_USER_ACTION_STORE,
    VERSIONED_USER_LINK_STORE, VERSIONED_USER_STORE, VERSIONED_USER_WALLET_STORE,
};
use candid::{CandidType, Deserialize};
use cashier_types::versioned::*;

/// Migration result for a single entity type
#[derive(Debug, Clone, CandidType, Deserialize, Default)]
pub struct EntityMigrationResult {
    pub migrated_count: u64,
    pub failed_count: u64,
    pub total_count: u64,
}

impl EntityMigrationResult {
    pub fn success_rate(&self) -> f64 {
        if self.total_count == 0 {
            1.0
        } else {
            self.migrated_count as f64 / self.total_count as f64
        }
    }

    pub fn is_complete(&self) -> bool {
        self.failed_count == 0 && self.total_count > 0
    }
}

/// Overall migration result
#[derive(Debug, Clone, CandidType, Deserialize, Default)]
pub struct MigrationResult {
    pub users: EntityMigrationResult,
    pub user_wallets: EntityMigrationResult,
    pub user_links: EntityMigrationResult,
    pub user_actions: EntityMigrationResult,
    pub links: EntityMigrationResult,
    pub link_actions: EntityMigrationResult,
    pub actions: EntityMigrationResult,
    pub action_intents: EntityMigrationResult,
    pub intents: EntityMigrationResult,
    pub intent_transactions: EntityMigrationResult,
    pub transactions: EntityMigrationResult,
}

impl MigrationResult {
    pub fn total_migrated(&self) -> u64 {
        self.users.migrated_count
            + self.user_wallets.migrated_count
            + self.user_links.migrated_count
            + self.user_actions.migrated_count
            + self.links.migrated_count
            + self.link_actions.migrated_count
            + self.actions.migrated_count
            + self.action_intents.migrated_count
            + self.intents.migrated_count
            + self.intent_transactions.migrated_count
            + self.transactions.migrated_count
    }

    pub fn total_failed(&self) -> u64 {
        self.users.failed_count
            + self.user_wallets.failed_count
            + self.user_links.failed_count
            + self.user_actions.failed_count
            + self.links.failed_count
            + self.link_actions.failed_count
            + self.actions.failed_count
            + self.action_intents.failed_count
            + self.intents.failed_count
            + self.intent_transactions.failed_count
            + self.transactions.failed_count
    }

    pub fn total_records(&self) -> u64 {
        self.users.total_count
            + self.user_wallets.total_count
            + self.user_links.total_count
            + self.user_actions.total_count
            + self.links.total_count
            + self.link_actions.total_count
            + self.actions.total_count
            + self.action_intents.total_count
            + self.intents.total_count
            + self.intent_transactions.total_count
            + self.transactions.total_count
    }

    pub fn overall_success_rate(&self) -> f64 {
        let total = self.total_records();
        if total == 0 {
            1.0
        } else {
            self.total_migrated() as f64 / total as f64
        }
    }

    pub fn is_complete(&self) -> bool {
        self.total_failed() == 0 && self.total_records() > 0
    }
}

/// Status showing counts in old vs new stores
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct EntityMigrationStatus {
    pub old_count: u64,
    pub new_count: u64,
}

impl EntityMigrationStatus {
    pub fn is_fully_migrated(&self) -> bool {
        self.old_count == self.new_count && self.old_count > 0
    }

    pub fn migration_percentage(&self) -> f64 {
        if self.old_count == 0 {
            1.0
        } else {
            self.new_count as f64 / self.old_count as f64
        }
    }
}

/// Migration status for all entity types
#[derive(Debug, Clone, CandidType, Deserialize)]
pub struct MigrationStatus {
    pub users: EntityMigrationStatus,
    pub user_wallets: EntityMigrationStatus,
    pub user_links: EntityMigrationStatus,
    pub user_actions: EntityMigrationStatus,
    pub links: EntityMigrationStatus,
    pub link_actions: EntityMigrationStatus,
    pub actions: EntityMigrationStatus,
    pub action_intents: EntityMigrationStatus,
    pub intents: EntityMigrationStatus,
    pub intent_transactions: EntityMigrationStatus,
    pub transactions: EntityMigrationStatus,
}

impl MigrationStatus {
    pub fn total_old_records(&self) -> u64 {
        self.users.old_count
            + self.user_wallets.old_count
            + self.user_links.old_count
            + self.user_actions.old_count
            + self.links.old_count
            + self.link_actions.old_count
            + self.actions.old_count
            + self.action_intents.old_count
            + self.intents.old_count
            + self.intent_transactions.old_count
            + self.transactions.old_count
    }

    pub fn total_new_records(&self) -> u64 {
        self.users.new_count
            + self.user_wallets.new_count
            + self.user_links.new_count
            + self.user_actions.new_count
            + self.links.new_count
            + self.link_actions.new_count
            + self.actions.new_count
            + self.action_intents.new_count
            + self.intents.new_count
            + self.intent_transactions.new_count
            + self.transactions.new_count
    }

    pub fn overall_migration_percentage(&self) -> f64 {
        let total_old = self.total_old_records();
        if total_old == 0 {
            1.0
        } else {
            self.total_new_records() as f64 / total_old as f64
        }
    }

    pub fn is_fully_migrated(&self) -> bool {
        self.total_old_records() == self.total_new_records() && self.total_old_records() > 0
    }
}

/// Migration service to transfer data from old stores to versioned stores
pub struct MigrationService;

impl MigrationService {
    /// Migrate all data from old stores to versioned stores
    pub fn migrate_all() -> MigrationResult {
        let mut result = MigrationResult::default();

        result.users = Self::migrate_users();
        result.user_wallets = Self::migrate_user_wallets();
        result.user_links = Self::migrate_user_links();
        result.user_actions = Self::migrate_user_actions();
        result.links = Self::migrate_links();
        result.link_actions = Self::migrate_link_actions();
        result.actions = Self::migrate_actions();
        result.action_intents = Self::migrate_action_intents();
        result.intents = Self::migrate_intents();
        result.intent_transactions = Self::migrate_intent_transactions();
        result.transactions = Self::migrate_transactions();

        result
    }

    /// Migrate batch 1: User-related entities (Users, UserWallets, UserLinks)
    pub fn migrate_batch_1() -> MigrationResult {
        let mut result = MigrationResult::default();

        result.users = Self::migrate_users();
        result.user_wallets = Self::migrate_user_wallets();
        result.user_links = Self::migrate_user_links();

        result
    }

    /// Migrate batch 2: User actions and Links
    pub fn migrate_batch_2() -> MigrationResult {
        let mut result = MigrationResult::default();

        result.user_actions = Self::migrate_user_actions();
        result.links = Self::migrate_links();

        result
    }

    /// Migrate batch 3: Link actions and Actions
    pub fn migrate_batch_3() -> MigrationResult {
        let mut result = MigrationResult::default();

        result.link_actions = Self::migrate_link_actions();
        result.actions = Self::migrate_actions();

        result
    }

    /// Migrate batch 4: Action intents and Intents
    pub fn migrate_batch_4() -> MigrationResult {
        let mut result = MigrationResult::default();

        result.action_intents = Self::migrate_action_intents();
        result.intents = Self::migrate_intents();

        result
    }

    /// Migrate batch 5: Intent transactions and Transactions
    pub fn migrate_batch_5() -> MigrationResult {
        let mut result = MigrationResult::default();

        result.intent_transactions = Self::migrate_intent_transactions();
        result.transactions = Self::migrate_transactions();

        result
    }

    /// Migrate users from old store to versioned store
    pub fn migrate_users() -> EntityMigrationResult {
        USER_STORE.with_borrow(|old_store| {
            VERSIONED_USER_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0; // Simplified - no error handling for now

                for (key, user) in old_store.iter() {
                    let versioned_user = VersionedUser::migrate(user);
                    new_store.insert(key.clone(), versioned_user);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate user wallets from old store to versioned store
    pub fn migrate_user_wallets() -> EntityMigrationResult {
        USER_WALLET_STORE.with_borrow(|old_store| {
            VERSIONED_USER_WALLET_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, user_wallet) in old_store.iter() {
                    let versioned_user_wallet = VersionedUserWallet::migrate(user_wallet);
                    new_store.insert(key.clone(), versioned_user_wallet);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate user links from old store to versioned store
    pub fn migrate_user_links() -> EntityMigrationResult {
        USER_LINK_STORE.with_borrow(|old_store| {
            VERSIONED_USER_LINK_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, user_link) in old_store.iter() {
                    let versioned_user_link = VersionedUserLink::migrate(user_link);
                    new_store.insert(key.clone(), versioned_user_link);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate user actions from old store to versioned store
    pub fn migrate_user_actions() -> EntityMigrationResult {
        USER_ACTION_STORE.with_borrow(|old_store| {
            VERSIONED_USER_ACTION_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, user_action) in old_store.iter() {
                    let versioned_user_action = VersionedUserAction::migrate(user_action);
                    new_store.insert(key.clone(), versioned_user_action);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate links from old store to versioned store
    pub fn migrate_links() -> EntityMigrationResult {
        LINK_STORE.with_borrow(|old_store| {
            VERSIONED_LINK_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, link) in old_store.iter() {
                    let versioned_link = VersionedLink::migrate(link);
                    new_store.insert(key.clone(), versioned_link);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate link actions from old store to versioned store
    pub fn migrate_link_actions() -> EntityMigrationResult {
        LINK_ACTION_STORE.with_borrow(|old_store| {
            VERSIONED_LINK_ACTION_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, link_action) in old_store.iter() {
                    let versioned_link_action = VersionedLinkAction::migrate(link_action);
                    new_store.insert(key.clone(), versioned_link_action);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate actions from old store to versioned store
    pub fn migrate_actions() -> EntityMigrationResult {
        ACTION_STORE.with_borrow(|old_store| {
            VERSIONED_ACTION_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, action) in old_store.iter() {
                    let versioned_action = VersionedAction::migrate(action);
                    new_store.insert(key.clone(), versioned_action);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate action intents from old store to versioned store
    pub fn migrate_action_intents() -> EntityMigrationResult {
        ACTION_INTENT_STORE.with_borrow(|old_store| {
            VERSIONED_ACTION_INTENT_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, action_intent) in old_store.iter() {
                    let versioned_action_intent = VersionedActionIntent::migrate(action_intent);
                    new_store.insert(key.clone(), versioned_action_intent);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate intents from old store to versioned store
    pub fn migrate_intents() -> EntityMigrationResult {
        INTENT_STORE.with_borrow(|old_store| {
            VERSIONED_INTENT_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, intent) in old_store.iter() {
                    let versioned_intent = VersionedIntent::migrate(intent);
                    new_store.insert(key.clone(), versioned_intent);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate intent transactions from old store to versioned store
    pub fn migrate_intent_transactions() -> EntityMigrationResult {
        INTENT_TRANSACTION_STORE.with_borrow(|old_store| {
            VERSIONED_INTENT_TRANSACTION_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, intent_transaction) in old_store.iter() {
                    let versioned_intent_transaction =
                        VersionedIntentTransaction::migrate(intent_transaction);
                    new_store.insert(key.clone(), versioned_intent_transaction);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Migrate transactions from old store to versioned store
    pub fn migrate_transactions() -> EntityMigrationResult {
        TRANSACTION_STORE.with_borrow(|old_store| {
            VERSIONED_TRANSACTION_STORE.with_borrow_mut(|new_store| {
                let mut migrated_count = 0;
                let failed_count = 0;

                for (key, transaction) in old_store.iter() {
                    let versioned_transaction = VersionedTransaction::migrate(transaction);
                    new_store.insert(key.clone(), versioned_transaction);
                    migrated_count += 1;
                }

                EntityMigrationResult {
                    migrated_count,
                    failed_count,
                    total_count: migrated_count + failed_count,
                }
            })
        })
    }

    /// Get migration status - returns counts of records in old vs new stores
    pub fn get_migration_status() -> MigrationStatus {
        MigrationStatus {
            users: EntityMigrationStatus {
                old_count: USER_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_USER_STORE.with_borrow(|store| store.len()),
            },
            user_wallets: EntityMigrationStatus {
                old_count: USER_WALLET_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_USER_WALLET_STORE.with_borrow(|store| store.len()),
            },
            user_links: EntityMigrationStatus {
                old_count: USER_LINK_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_USER_LINK_STORE.with_borrow(|store| store.len()),
            },
            user_actions: EntityMigrationStatus {
                old_count: USER_ACTION_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_USER_ACTION_STORE.with_borrow(|store| store.len()),
            },
            links: EntityMigrationStatus {
                old_count: LINK_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_LINK_STORE.with_borrow(|store| store.len()),
            },
            link_actions: EntityMigrationStatus {
                old_count: LINK_ACTION_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_LINK_ACTION_STORE.with_borrow(|store| store.len()),
            },
            actions: EntityMigrationStatus {
                old_count: ACTION_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_ACTION_STORE.with_borrow(|store| store.len()),
            },
            action_intents: EntityMigrationStatus {
                old_count: ACTION_INTENT_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_ACTION_INTENT_STORE.with_borrow(|store| store.len()),
            },
            intents: EntityMigrationStatus {
                old_count: INTENT_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_INTENT_STORE.with_borrow(|store| store.len()),
            },
            intent_transactions: EntityMigrationStatus {
                old_count: INTENT_TRANSACTION_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_INTENT_TRANSACTION_STORE.with_borrow(|store| store.len()),
            },
            transactions: EntityMigrationStatus {
                old_count: TRANSACTION_STORE.with_borrow(|store| store.len()),
                new_count: VERSIONED_TRANSACTION_STORE.with_borrow(|store| store.len()),
            },
        }
    }
    /// Clear all versioned stores (useful for re-migration)
    pub fn clear_versioned_stores() {
        VERSIONED_USER_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_USER_WALLET_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_USER_LINK_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_USER_ACTION_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_LINK_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_LINK_ACTION_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_ACTION_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_ACTION_INTENT_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_INTENT_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_INTENT_TRANSACTION_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });

        VERSIONED_TRANSACTION_STORE.with_borrow_mut(|store| {
            let keys: Vec<_> = store.iter().map(|(key, _)| key).collect();
            for key in keys {
                store.remove(&key);
            }
        });
    }
}
