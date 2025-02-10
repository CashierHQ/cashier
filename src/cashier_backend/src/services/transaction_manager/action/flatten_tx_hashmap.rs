pub fn flatten_tx_hashmap(
    intent_txs: &std::collections::HashMap<String, Vec<cashier_types::Transaction>>,
) -> Vec<cashier_types::Transaction> {
    let mut txs = vec![];

    for (_, transactions) in intent_txs {
        for tx in transactions {
            txs.push(tx.clone());
        }
    }

    txs
}
