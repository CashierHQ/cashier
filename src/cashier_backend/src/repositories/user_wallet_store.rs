use super::USER_WALLET_STORE;

pub fn create(wallet: String, user_id: String) {
    USER_WALLET_STORE.with(|store| {
        store.borrow_mut().insert(wallet, user_id);
    });
}

pub fn get(wallet: &str) -> Option<String> {
    USER_WALLET_STORE.with(|store| store.borrow().get(&wallet.to_string()))
}
