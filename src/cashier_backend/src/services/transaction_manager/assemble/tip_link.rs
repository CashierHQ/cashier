use cashier_types::Link;

pub fn create() -> Vec<Vec<String>> {
    let mut tx_map_template = vec![
        // one for deposit tip, one for approve backend use the fee
        vec!["icrc1_transfer".to_string(), "icrc2_approve".to_string()],
        vec!["update_intent".to_string()],
    ];

    return tx_map_template;
}
