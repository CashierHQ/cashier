use crate::types::ext::cashier_nft::CandyShared;

pub struct NftAssetsInfo {
    pub url: String,
    pub mine: String,
    pub purpose: String,
}

pub struct MintNftArgs {
    pub name: String,
    pub description: String,
    pub assets: Vec<NftAssetsInfo>,
}

impl MintNftArgs {
    pub fn to_icrc97_metadata(&self) -> Box<CandyShared> {
        let name = (
            "name".to_string(),
            Box::new(CandyShared::Text(self.name.clone())),
        );
        let description = (
            "description".to_string(),
            Box::new(CandyShared::Text(self.description.clone())),
        );

        let assets = self
            .assets
            .iter()
            .flat_map(|asset| {
                let url = (
                    "url".to_string(),
                    Box::new(CandyShared::Text(asset.url.clone())),
                );
                let mine = (
                    "mine".to_string(),
                    Box::new(CandyShared::Text(asset.mine.clone())),
                );
                let purpose = (
                    "purpose".to_string(),
                    Box::new(CandyShared::Text(asset.purpose.clone())),
                );
                vec![url, mine, purpose]
            })
            .collect::<Vec<(std::string::String, Box<CandyShared>)>>();

        let metadata = CandyShared::Map(vec![
            name,
            description,
            ("assets".to_string(), Box::new(CandyShared::Map(assets))),
        ]);

        return Box::new(metadata);
    }
}
