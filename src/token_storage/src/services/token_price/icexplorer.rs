use std::u128;

use candid::{Nat, Principal};
use ic_cdk::api::management_canister::http_request::{http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod};
use log::info;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::services::token_price::TokenProvider;

const IC_EXPLORER_BASE_URL:&str = "https://api.icexplorer.io/api";

#[derive(Debug, Serialize, Deserialize)]
struct TokenListRequest {
  pub page: u32,
  pub size: u32
}

// #[derive(Debug, Serialize, Deserialize)]
// struct TokenListRequest {
//   pub page: u32,
//   pub size: u32
// }

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IcExplorerTokenDetails {
  pub name: String,
  pub symbol: String,
  pub price: Nat,
  pub fee: String,
  pub ledger_id: Principal,
  pub token_decimal: u8,
}

// IcExplorerTokenDetail {
//   controllerArray: string[];
//   cycleBalance: string;
//   fee: string;
//   fullyDilutedMarketCap: string;
//   holderAmount: number;
//   ledgerId: string;
//   marketCap: string;
//   memorySize: string;
//   mintingAccount: string;
//   moduleHash: string;
//   name: string;
//   price: string;
//   priceChange24: string;
//   priceICP: string;
//   source: string;
//   standardArray: string[];
//   supplyCap: string;
//   symbol: string;
//   tokenDecimal: number;
//   totalSupply: string;
//   transactionAmount: number;
//   tvl: string;
//   txVolume24: string;
// }

/// A TokenProvider that fetches token prices from IcExplorer
pub struct IcExplorerTokenProvider {
    pub url: String,
}

impl IcExplorerTokenProvider {
    pub fn new(url: String) -> Self {
        Self { url }
    }
}

impl TokenProvider for IcExplorerTokenProvider {

    fn list_tokens(&self) -> std::pin::Pin<Box<dyn Future<Output = Result<Vec<super::TokenData>, ()>>>> {
Box::pin(async move {

    
    // 2.1 Setup the URL
    let host = "putsreq.com";
    let url = format!("{IC_EXPLORER_BASE_URL}/token/list");
    
    // 2.2 prepare headers for the system http_request call
    //Note that `HttpHeader` is declared in line 4
    let request_headers = vec![
        HttpHeader {
            name: "Content-Type".to_string(),
            value: "application/json".to_string(),
        },
        ];
        
        let json_string = serde_json::to_string(&TokenListRequest {
            page: 1,
            size: 100
        }).unwrap();
        
        let json_utf8: Vec<u8> = json_string.into_bytes();
        let request_body: Option<Vec<u8>> = Some(json_utf8);
        
        let request = CanisterHttpRequestArgument {
            url: url.to_string(),
            max_response_bytes: None, //optional for request
            method: HttpMethod::POST,
            headers: request_headers,
            body: request_body,
            transform: None,
            // transform: None, //optional for request
        };
        
        //3. MAKE HTTPS REQUEST AND WAIT FOR RESPONSE
        
        //Note: in Rust, `http_request()` already sends the cycles needed
        //so no need for explicit Cycles.add() as in Motoko
        match http_request(request, 21_000_000_000).await {
            //4. DECODE AND RETURN THE RESPONSE
            
            //See:https://docs.rs/ic-cdk/latest/ic_cdk/api/management_canister/http_request/struct.HttpResponse.html
            Ok((response,)) => {

                let value: Value = serde_json::from_slice(response.body.as_slice()).unwrap();

                info!("[IcExplorerTokenProvider] values: {:?}", value);

                let list= value.get("data").unwrap().get("list").unwrap();

                let list: Vec<IcExplorerTokenDetails> = serde_json::from_value(list.clone()).unwrap();
                info!("[IcExplorerTokenProvider] list: {:?}", list);
                
                Ok(vec![])
            }
            Err((r, m)) => {
                info!("The http_request resulted into error. RejectionCode: {r:?}, Error: {m}");
                Err(())
            }
        }
    })
    }
}