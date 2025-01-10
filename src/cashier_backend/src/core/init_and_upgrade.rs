use ic_cdk::{init, post_upgrade, pre_upgrade};

use crate::{repositories, utils::random::init_ic_rand};

#[init]
fn init() {
    init_ic_rand();
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    repositories::load();
    init_ic_rand();
}
