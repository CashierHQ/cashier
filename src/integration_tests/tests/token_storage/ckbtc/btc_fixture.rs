// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use bitcoin::{Address, Network::Regtest};
use bitcoincore_rpc::{Auth, Client as BtcClient, RpcApi, json::ScanTxOutRequest};

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

        // Create or load a wallet
        let wallet_name = "test_wallet";
        match btc_rpc_client.create_wallet(wallet_name, None, None, None, None) {
            Ok(_) => println!("Created wallet: {}", wallet_name),
            Err(e) => {
                // Wallet might already exist, try to load it
                if let Err(load_err) = btc_rpc_client.load_wallet(wallet_name) {
                    println!(
                        "Warning: Could not create or load wallet: {} / {}",
                        e, load_err
                    );
                }
            }
        }

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
        let descriptor = format!("addr({})", address);
        let scan_objects = vec![ScanTxOutRequest::Single(descriptor)];

        match self.btc_rpc_client.scan_tx_out_set_blocking(&scan_objects) {
            Ok(result) => result.total_amount.to_btc(),
            Err(e) => {
                eprintln!("Error scanning UTXO set for {}: {}", address, e);
                0.0
            }
        }
    }
}
