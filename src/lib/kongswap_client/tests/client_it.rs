use ic_mple_client::{
    IcAgentClient,
    ic_agent::{agent::AgentBuilder, export::reqwest::Url},
};
use kongswap_client::{KONGSWAP_PRINCIPAL, client::KongSwapBackendClient, types::PoolsResult};

#[tokio::test]
async fn should_fetch_prices_from_kongswap() {
    // Arrange
    let url = Url::parse("https://ic0.app").unwrap();
    let agent = AgentBuilder::default().with_url(url).build().unwrap();
    let client = IcAgentClient::with_agent(KONGSWAP_PRINCIPAL, agent);
    let client = KongSwapBackendClient::new(client);

    // Act
    let result = client.pools(None).await;

    // Assert
    assert!(result.is_ok());
    let result = result.unwrap();

    match result {
        PoolsResult::Ok(tokens) => assert!(!tokens.is_empty()),
        PoolsResult::Err(e) => panic!("Failed to get all tokens: {}", e),
    }
}
