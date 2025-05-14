use super::USER_WALLET_STORE;
use cashier_types::{UserWallet, UserWalletKey};

#[cfg_attr(test, faux::create)]
#[derive(Clone)]

pub struct UserWalletRepository {}

#[cfg_attr(test, faux::methods)]
impl UserWalletRepository {
    pub fn new() -> Self {
        Self {}
    }
    pub fn create(&self, wallet: UserWalletKey, user: UserWallet) {
        USER_WALLET_STORE.with_borrow_mut(|store| {
            store.insert(wallet, user);
        });
    }

    pub fn get(&self, wallet: &UserWalletKey) -> Option<UserWallet> {
        USER_WALLET_STORE.with_borrow(|store| store.get(wallet))
    }
}
