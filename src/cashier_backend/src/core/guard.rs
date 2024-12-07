use candid::Principal;

use crate::repositories::link_store;

static ANONYMOUS: Principal = Principal::anonymous();

pub fn is_not_anonymous() -> Result<(), String> {
    let caller = ic_cdk::caller();
    assert!(caller != ANONYMOUS, "Anonymous caller is not allowed");
    Ok(())
}

pub fn is_link_creator(creator: String, link_id: &str) -> Result<(), String> {
    is_not_anonymous()?;

    let link = link_store::get(link_id);
    match link {
        Some(link) => {
            assert!(
                link.creator.unwrap() == creator,
                "You are not the creator of this link"
            );
            Ok(())
        }
        None => Err("Link not found".to_string()),
    }
}
