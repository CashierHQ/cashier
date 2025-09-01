use cashier_common::random::init_ic_rand;
use ic_cdk::{init, post_upgrade, pre_upgrade};

#[init]
fn init() {
    init_ic_rand();
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    init_ic_rand();
}
