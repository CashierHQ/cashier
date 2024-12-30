use candid::Principal;

static ANONYMOUS: Principal = Principal::anonymous();

pub fn is_not_anonymous() -> Result<(), String> {
    let caller = ic_cdk::caller();
    assert!(caller != ANONYMOUS, "Anonymous caller is not allowed");
    Ok(())
}
