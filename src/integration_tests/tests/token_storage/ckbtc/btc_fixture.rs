// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use bitcoin::{Address, Network::Regtest};
use bitcoincore_rpc::{Auth, Client as BtcClient, RpcApi};

pub struct BtcFixture {
    pub btc_rpc_client: BtcClient,
    pub test_btc_address: Address,
}

impl BtcFixture {
    pub fn new(rpc_url: &str, rpc_user: &str, rpc_password: &str) -> Self {
        let btc_rpc_client = BtcClient::new(
            rpc_url,
            Auth::UserPass(rpc_user.to_string(), rpc_password.to_string()),
        )
        .unwrap();

        let test_btc_address = btc_rpc_client
            .get_new_address(None, None)
            .unwrap()
            .require_network(Regtest)
            .unwrap();

        Self {
            btc_rpc_client,
            test_btc_address,
        }
    }

    pub fn generate_to_address(&self, blocks: u64, dest_address: &Address) {
        let _ = self
            .btc_rpc_client
            .generate_to_address(blocks, dest_address);
    }

    pub fn get_balance(&self, address: &Address) -> f64 {
        let unspent = self
            .btc_rpc_client
            .list_unspent(None, None, Some(&[address]), None, None)
            .unwrap();

        unspent.iter().map(|u| u.amount.to_btc()).sum()
    }
}
