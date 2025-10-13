use std::{f32::consts::E, fmt::Debug, future::Future, pin::Pin};

pub trait LinkV2State: Debug {
    fn go_next(&self) -> Pin<Box<dyn Future<Output = Result<Box<dyn LinkV2State>, String>>>>;

    fn go_back(&self) -> Pin<Box<dyn Future<Output = Result<Box<dyn LinkV2State>, String>>>> {
        Box::pin(async move { Err("go_back not implemented".to_string()) })
    }
}
