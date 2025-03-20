use ic_cdk::{init, post_upgrade, pre_upgrade};

use crate::repository::load;

#[init]
fn init() {}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    load();
}
