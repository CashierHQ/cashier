use std::pin::Pin;

use candid::Principal;


mod icexplorer;

pub struct TokenData {

    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub price: f64,
    pub canister_id: Principal,

}

/// A provider of token prices
trait TokenProvider {

    /// Returns a list of tokens
    fn list_tokens(&self ) -> Pin<Box<dyn Future<Output = Result<Vec<TokenData>, ()>> + 'static>>;

}

pub struct TokenPriceService {
}

impl TokenPriceService {

    pub async fn get_token_list(&self) -> () {
        let provider = icexplorer::IcExplorerTokenProvider::new("https://icexplorer.io".to_string());
        provider.list_tokens().await.unwrap();
    }

}