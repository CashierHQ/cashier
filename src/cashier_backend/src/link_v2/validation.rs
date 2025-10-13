use cashier_backend_types::repository::{
    asset_info::AssetInfo,
    link::v1::{Link, LinkType},
};

pub fn validate_add_asset_with_link_type(link: &Link, asset_infos: &[AssetInfo]) -> bool {
    if link.link_type == LinkType::SendTip {
        // Send tip only use one time with one asset
        // check amount_per_link_use_action for asset > 0
        // check link_use_action_max_count == 1

        if asset_infos.is_empty() {
            return false;
        }

        if asset_infos.len() > 1 {
            // Send tip can only have one asset
            return false;
        }

        let Some(amount_per_link_use_action) =
            asset_infos.first().map(|a| a.amount_per_link_use_action)
        else {
            return false;
        };

        if amount_per_link_use_action == 0 {
            return false;
        }

        true
    } else if link.link_type == LinkType::SendAirdrop {
        // Send airdrop use multiple time with one asset
        // check amount_per_link_use_action for asset > 0
        // check link_use_action_max_count >= 1

        if asset_infos.is_empty() {
            return false;
        }

        if asset_infos.len() > 1 {
            // Airdrop can only have one asset
            return false;
        }

        let Some(amount_per_link_use_action) =
            asset_infos.first().map(|a| a.amount_per_link_use_action)
        else {
            return false;
        };

        if amount_per_link_use_action == 0 {
            return false;
        }

        true
    } else if link.link_type == LinkType::SendTokenBasket {
        // Send token basket use one time with multiple asset
        // check amount_per_link_use_action for asset > 0
        // check link_use_action_max_count == 1

        if asset_infos.is_empty() {
            return false;
        }

        // Token basket can have multiple assets
        for asset in asset_infos.iter() {
            if asset.amount_per_link_use_action == 0 {
                return false;
            }
        }
        true
    } else if link.link_type == LinkType::ReceivePayment {
        // Receive payment use one time with one asset
        // check amount_per_link_use_action for asset > 0
        // check link_use_action_max_count == 1
        if asset_infos.is_empty() {
            return false;
        }

        if asset_infos.len() > 1 {
            // Receive payment can only have one asset
            return false;
        }

        let Some(amount_per_link_use_action) =
            asset_infos.first().map(|a| a.amount_per_link_use_action)
        else {
            return false;
        };

        if amount_per_link_use_action == 1 {
            return false;
        }

        true
    } else {
        // link type is not supported
        false
    }
}
