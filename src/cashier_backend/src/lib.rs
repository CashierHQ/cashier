#[ic_cdk::query]
fn greet(name: String) -> String {



    
    format!("Hello, {}!", name)
}

#[ic_cdk::query]
fn test() -> String {
    "Hello, World!".to_string()
}
