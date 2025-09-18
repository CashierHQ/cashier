use std::{cell::RefCell, collections::HashMap, thread::LocalKey};

use candid::Principal;
use ic_mple_utils::store::Storage;
use icpswap_client::{CanisterClient, client::IcpSwapNodeIndexClient};
use kongswap_client::{client::KongSwapBackendClient, types::PoolsResult};
use log::{debug, warn};

pub type PriceMap = HashMap<Principal, f64>;

thread_local! {
    /// A map of token id to price in USD
    static TOKEN_PRICES: RefCell<PriceMap> = RefCell::new(Default::default());
}

/// A service that provides access to the token prices
pub struct TokenPriceService<
    S: Storage<PriceMap>,
    KONGSWAP: CanisterClient,
    ICPSWAP: CanisterClient,
> {
    icpswap_client: IcpSwapNodeIndexClient<ICPSWAP>,
    kongswap_client: KongSwapBackendClient<KONGSWAP>,
    /// A map of token id to price in USD
    prices: S,
}

// Address of ckUSDT canister. Since KongSwap provides all pairs for ckUSDT, we can use it as a reference when fetching prices
const CKUSDT_ADDRESS: &str = "cngnf-vqaaa-aaaar-qag4q-cai";
// Address of ckUSDC canister
const CKUSDC_ADDRESS: &str = "xevnm-gaaaa-aaaar-qafnq-cai";

impl<KONGSWAP: CanisterClient, ICPSWAP: CanisterClient>
    TokenPriceService<&'static LocalKey<RefCell<PriceMap>>, KONGSWAP, ICPSWAP>
{
    /// Create a new TokenPriceService backed by a thread local storage
    pub fn new_thread_local(kongswap_client: KONGSWAP, icpswap_client: ICPSWAP) -> Self {
        Self::new(&TOKEN_PRICES, kongswap_client, icpswap_client)
    }
}

impl<S: Storage<PriceMap>, KONGSWAP: CanisterClient, ICPSWAP: CanisterClient>
    TokenPriceService<S, KONGSWAP, ICPSWAP>
{
    /// Create a new TokenPriceService
    pub fn new(storage: S, kongswap_client: KONGSWAP, icpswap_client: ICPSWAP) -> Self {
        Self {
            icpswap_client: IcpSwapNodeIndexClient::new(icpswap_client),
            kongswap_client: KongSwapBackendClient::new(kongswap_client),
            prices: storage,
        }
    }

    /// Fetch all token prices from kongswap.
    /// As the prices fetched from kongswap are in USDT, we convert them to USDC using the price of the ckUSDT/ckUSDC pair
    async fn fetch_prices_from_kongswap(&mut self) -> Result<HashMap<Principal, f64>, String> {

        // ToDo: The function should return Error instead of String
        let TO_DO = 1000;

        let tokens = self
            .kongswap_client
            .pools(Some(CKUSDT_ADDRESS))
            .await
            .map_err(|e| e.to_string())?;
        let tokens = match tokens {
            PoolsResult::Ok(tokens) => tokens,
            PoolsResult::Err(e) => return Err(e),
        };

        // Get the price of ckUSDC/ckUSDT. We use it to convert the prices from USDT to USDC
        let usdc_price_in_usdt = tokens
            .iter()
            .find(|token| token.address_0 == CKUSDC_ADDRESS)
            .ok_or("Failed to find ckUSDC/ckUSDT pair in kongswap")?
            .price;

        let mut result = HashMap::new();

        // Add ckUSDT price as it is not in the result of kongswap
        result.insert(
            Principal::from_text(CKUSDT_ADDRESS).unwrap(),
            1.0 / usdc_price_in_usdt,
        );

        for token in tokens {
            if let Ok(address) = Principal::from_text(&token.address_0) {
                let price_in_usdt = token.price;
                let price_in_usdc = price_in_usdt / usdc_price_in_usdt;
                if price_in_usdc.is_sign_positive() && price_in_usdc != 0f64 {
                    result.insert(address, price_in_usdc);
                } else {
                    debug!(
                        "Skipping token {} with negative or zero price {}",
                        token.address_0, price_in_usdc
                    );
                }
            } else {
                warn!("Failed to parse token address: {}", token.address_0);
            }
        }
        Ok(result)
    }

    /// Fetch all token prices from icpswap
    async fn fetch_prices_from_icpswap(&mut self) -> Result<HashMap<Principal, f64>, String> {

        // ToDo: The function should return Error instead of String
        let TO_DO = 1000;

        let tokens = self
            .icpswap_client
            .get_all_tokens()
            .await
            .map_err(|e| e.to_string())?;
        let mut result = HashMap::new();
        for token in tokens {
            if let Ok(address) = Principal::from_text(&token.address) {
                if token.priceUSD.is_sign_positive() && token.priceUSD != 0f64 {
                    result.insert(address, token.priceUSD);
                } else {
                    debug!(
                        "Skipping token {} with negative or zero price {}",
                        address, token.priceUSD
                    );
                }
            } else {
                warn!("Failed to parse token address: {}", token.address);
            }
        }
        Ok(result)
    }

    /// Fetch all token prices from kongswap and icpswap and update the prices
    pub async fn update_prices(&mut self) {
        match self.fetch_prices_from_kongswap().await {
            Ok(new_prices) => {
                self.prices
                    .with_borrow_mut(|prices| prices.extend(new_prices));
            }
            Err(e) => warn!("Failed to fetch prices from kongswap: {}", e),
        }

        match self.fetch_prices_from_icpswap().await {
            Ok(new_prices) => {
                self.prices
                    .with_borrow_mut(|prices| prices.extend(new_prices));
            }
            Err(e) => warn!("Failed to fetch prices from icpswap: {}", e),
        }
    }

    /// Get all token prices
    pub fn get_prices(&self) -> HashMap<Principal, f64> {
        self.prices.with_borrow(|prices| prices.clone())
    }

    /// Get the price of a token
    pub fn get_price(&self, token_id: &Principal) -> Option<f64> {
        self.prices
            .with_borrow(|prices| prices.get(token_id).copied())
    }

    /// Get the price of a set of tokens
    pub fn get_prices_for_tokens(&self, tokens: &[Principal]) -> HashMap<Principal, f64> {
        let mut result = HashMap::new();
        for token in tokens {
            if let Some(price) = self.get_price(token) {
                result.insert(*token, price);
            }
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use ic_mple_client::mock::MockCanisterClient;
    use icpswap_client::types::PublicTokenOverview;
    use kongswap_client::types::PoolReply;

    use super::*;

    #[tokio::test]
    async fn should_fetch_prices_from_kongswap() {
        // Arrange
        let price_map = RefCell::new(HashMap::new());
        let mut token_price_service = new_service(price_map);

        // Act
        let result = token_price_service.fetch_prices_from_kongswap().await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(3, result.len());

        // The prices are recalculated based on the ckUSDC price
        assert_eq!(
            Some(&1.0),
            result.get(&Principal::from_text(CKUSDC_ADDRESS).unwrap())
        );
        assert_eq!(
            Some(&0.5),
            result.get(&Principal::from_text(CKUSDT_ADDRESS).unwrap())
        );
        assert_eq!(Some(&5.0), result.get(&Principal::from_slice(&[2; 29])));
    }

    #[tokio::test]
    async fn should_fetch_prices_from_icpswap() {
        // Arrange
        let price_map = RefCell::new(HashMap::new());
        let mut token_price_service = new_service(price_map);

        // Act
        let result = token_price_service.fetch_prices_from_icpswap().await;

        // Assert
        assert!(result.is_ok());
        let result = result.unwrap();
        assert_eq!(3, result.len());

        // The prices are recalculated based on the ckUSDC price
        assert_eq!(
            Some(&11.0),
            result.get(&Principal::from_text(CKUSDT_ADDRESS).unwrap())
        );
        assert_eq!(Some(&200.0), result.get(&Principal::from_slice(&[2; 29])));
        assert_eq!(Some(&100.0), result.get(&Principal::from_slice(&[3; 29])));
    }

    #[tokio::test]
    async fn test_update_prices() {
        // Arrange
        let price_map = RefCell::new(HashMap::new());
        let mut token_price_service = new_service(price_map);

        // Act
        token_price_service.update_prices().await;

        // Assert
        let result = token_price_service.get_prices();
        assert_eq!(4, result.len());

        // The prices from icpswap have higher priority
        assert_eq!(
            Some(&1.0),
            result.get(&Principal::from_text(CKUSDC_ADDRESS).unwrap())
        );
        assert_eq!(
            Some(&11.0),
            result.get(&Principal::from_text(CKUSDT_ADDRESS).unwrap())
        );
        assert_eq!(Some(&200.0), result.get(&Principal::from_slice(&[2; 29])));
        assert_eq!(Some(&100.0), result.get(&Principal::from_slice(&[3; 29])));
    }

    #[test]
    fn test_get_prices() {
        // Arrange
        let price_map = RefCell::new(
            [
                (Principal::from_text(CKUSDC_ADDRESS).unwrap(), 1.0),
                (Principal::from_text(CKUSDT_ADDRESS).unwrap(), 2.0),
            ]
            .into(),
        );
        let token_price_service = new_service(price_map);

        // Act & Assert - get all prices
        let prices = token_price_service.get_prices();
        assert_eq!(prices.len(), 2);
        assert!(prices.contains_key(&Principal::from_text(CKUSDC_ADDRESS).unwrap()));
        assert!(prices.contains_key(&Principal::from_text(CKUSDT_ADDRESS).unwrap()));

        // Act & Assert - get price for specific token
        {
            let price =
                token_price_service.get_price(&Principal::from_text(CKUSDC_ADDRESS).unwrap());
            assert_eq!(price, Some(1.0));

            let price =
                token_price_service.get_price(&Principal::from_text(CKUSDT_ADDRESS).unwrap());
            assert_eq!(price, Some(2.0));

            let price = token_price_service.get_price(&Principal::from_slice(&[2; 29]));
            assert_eq!(price, None);
        }

        // Act & Assert - get prices for specific tokens
        {
            let prices = token_price_service.get_prices_for_tokens(&[
                Principal::from_text(CKUSDC_ADDRESS).unwrap(),
                Principal::from_text(CKUSDT_ADDRESS).unwrap(),
            ]);
            assert_eq!(prices.len(), 2);
            assert!(prices.contains_key(&Principal::from_text(CKUSDC_ADDRESS).unwrap()));
            assert!(prices.contains_key(&Principal::from_text(CKUSDT_ADDRESS).unwrap()));
        }

        {
            let prices = token_price_service
                .get_prices_for_tokens(&[Principal::from_text(CKUSDT_ADDRESS).unwrap()]);
            assert_eq!(prices.len(), 1);
            assert!(prices.contains_key(&Principal::from_text(CKUSDT_ADDRESS).unwrap()));
        }

        {
            let prices = token_price_service.get_prices_for_tokens(&[
                Principal::from_text(CKUSDC_ADDRESS).unwrap(),
                Principal::from_slice(&[2; 29]),
                Principal::anonymous(),
            ]);
            assert_eq!(prices.len(), 1);
            assert!(prices.contains_key(&Principal::from_text(CKUSDC_ADDRESS).unwrap()));
        }
    }

    fn new_service<S: Storage<PriceMap>>(
        store: S,
    ) -> TokenPriceService<S, MockCanisterClient, MockCanisterClient> {
        let kong_client = MockCanisterClient::default();
        kong_client.add_query(
            "pools",
            Ok(PoolsResult::Ok(vec![
                PoolReply {
                    address_0: CKUSDC_ADDRESS.to_string(),
                    price: 2.0,
                    ..Default::default()
                },
                PoolReply {
                    address_0: Principal::from_slice(&[2; 29]).to_string(),
                    price: 10.0,
                    ..Default::default()
                },
            ])),
        );

        let icps_client = MockCanisterClient::default();
        icps_client.add_query(
            "getAllTokens",
            Ok(vec![
                PublicTokenOverview {
                    address: CKUSDT_ADDRESS.to_string(),
                    priceUSD: 11.0,
                    ..Default::default()
                },
                PublicTokenOverview {
                    address: Principal::from_slice(&[2; 29]).to_string(),
                    priceUSD: 200.0,
                    ..Default::default()
                },
                PublicTokenOverview {
                    address: Principal::from_slice(&[3; 29]).to_string(),
                    priceUSD: 100.0,
                    ..Default::default()
                },
            ]),
        );

        TokenPriceService::new(store, kong_client, icps_client)
    }
}
