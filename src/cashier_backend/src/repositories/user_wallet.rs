use super::USER_WALLET_STORE;
use cashier_types::{UserWallet, UserWalletKey};

pub fn create(wallet: UserWalletKey, user: UserWallet) {
    USER_WALLET_STORE.with_borrow_mut(|store| {
        store.insert(wallet, user);
    });
}

pub fn get(wallet: &UserWalletKey) -> Option<UserWallet> {
    USER_WALLET_STORE.with_borrow(|store| store.get(wallet))
}
