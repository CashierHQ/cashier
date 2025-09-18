use ic_mple_client::{
    IcAgentClient,
    ic_agent::{agent::AgentBuilder, export::reqwest::Url},
};
use icpswap_client::{client::IcpSwapNodeIndexClient, ICPSWAP_PRINCIPAL};

#[tokio::test]
async fn should_fetch_prices_from_icpswap() {
    // Arrange
            let url = Url::parse("https://ic0.app").unwrap();
        let agent = AgentBuilder::default().with_url(url).build().unwrap();
        let client = IcAgentClient::with_agent(ICPSWAP_PRINCIPAL, agent);
        let client = IcpSwapNodeIndexClient::new(client);

    // Act
    let result = client.get_all_tokens().await;

    // Assert
    assert!(result.is_ok());
    let result = result.unwrap();
    assert!(!result.is_empty());

}
