use candid::CandidType;
use serde::{Deserialize, Serialize};

use super::chain::Chain;

// Define enums for the `type` fields
#[derive(Debug, Serialize, Deserialize)]
pub enum ReceiveType {
    Link,
    Asset,
}

impl ReceiveType {
    pub fn to_string(&self) -> String {
        match self {
            ReceiveType::Link => "Link".to_string(),
            ReceiveType::Asset => "Asset".to_string(),
        }
    }

    pub fn from_string(received_type: &str) -> Result<ReceiveType, String> {
        match received_type {
            "Link" => Ok(ReceiveType::Link),
            "Asset" => Ok(ReceiveType::Asset),
            _ => Err("Invalid received type".to_string()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub enum SendType {
    Asset,
}

impl SendType {
    pub fn to_string(&self) -> String {
        match self {
            SendType::Asset => "Asset".to_string(),
        }
    }

    pub fn from_string(send_type: &str) -> Result<SendType, String> {
        match send_type {
            "Asset" => Ok(SendType::Asset),
            _ => Err("Invalid send type".to_string()),
        }
    }
}

pub enum FeeType {
    CashierFee,
    NetworkFee,
}

impl FeeType {
    pub fn to_string(&self) -> String {
        match self {
            FeeType::CashierFee => "CashierFee".to_string(),
            FeeType::NetworkFee => "NetworkFee".to_string(),
        }
    }

    pub fn from_string(fee_type: &str) -> Result<FeeType, String> {
        match fee_type {
            "CashierFee" => Ok(FeeType::CashierFee),
            "NetworkFee" => Ok(FeeType::NetworkFee),
            _ => Err("Invalid fee type".to_string()),
        }
    }
}

// Define structs for the objects
#[derive(Debug, Serialize, Deserialize, CandidType, Clone)]
pub struct Receive {
    pub chain: String, // default IC
    pub r#type: String,
    pub name: String,
    pub asset_amount: Option<u64>,
    pub asset_address: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, CandidType, Clone)]
pub struct Send {
    pub chain: String, // default IC
    pub r#type: String,
    pub amount: u64,
    pub address: String,
}

#[derive(Debug, Serialize, Deserialize, CandidType, Clone)]
pub struct Fee {
    pub r#type: String,
    pub chain: String, // default IC
    pub address: String,
    pub amount: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ConsentType {
    Receive(Receive),
    Send(Send),
    Fee(Fee),
    None,
}

impl ConsentType {
    pub fn build_send_consent(chain: Chain, amount: u64, address: String) -> Self {
        ConsentType::Send(Send {
            chain: chain.to_string(),
            r#type: SendType::Asset.to_string(),
            amount,
            address,
        })
    }

    pub fn build_send_app_fee_consent(chain: Chain, amount: u64, address: String) -> Self {
        ConsentType::Fee(Fee {
            chain: chain.to_string(),
            r#type: FeeType::CashierFee.to_string(),
            amount,
            address,
        })
    }

    pub fn build_receive_consent(
        chain: Chain,
        received_type: ReceiveType,
        name: String,
        asset_amount: Option<u64>,
        asset_address: Option<String>,
    ) -> Self {
        ConsentType::Receive(Receive {
            chain: chain.to_string(),
            r#type: received_type.to_string(),
            name,
            asset_amount,
            asset_address,
        })
    }
}
