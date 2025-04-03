use crate::types::Chain;

pub fn build_token_id(chain: &Chain, address: &str) -> String {
    let mut token_id = format!("{}:", chain.to_str());
    token_id.push_str(&format!("{}:", address));
    token_id
}
