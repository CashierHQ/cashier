use super::USER_WALLET_STORE;
use cashier_types::{UserWallet, UserWalletKey};

pub struct UserWalletRepository {}

impl UserWalletRepository {
    pub fn create(&self, wallet: UserWalletKey, user: UserWallet) {
        USER_WALLET_STORE.with_borrow_mut(|store| {
            store.insert(wallet, user);
        });
    }

    pub fn get(&self, wallet: &UserWalletKey) -> Option<UserWallet> {
        USER_WALLET_STORE.with_borrow(|store| store.get(wallet))
    }
}

impl Default for UserWalletRepository {
    fn default() -> Self {
        UserWalletRepository {}
    }
}
