use cashier_backend_types::dto::link::LinkDto;
use std::{fmt::Debug, future::Future, pin::Pin};

pub trait LinkV2State: Debug {
    fn go_next(&self) -> Pin<Box<dyn Future<Output = Result<Box<dyn LinkV2State>, String>>>>;
}

pub trait LinkV2: Debug {
    fn publish(&self) -> Pin<Box<dyn Future<Output = Result<LinkDto, String>>>>;
    fn unpublish(&self) -> Pin<Box<dyn Future<Output = Result<LinkDto, String>>>>;
    fn claim(&self) -> Pin<Box<dyn Future<Output = Result<LinkDto, String>>>>;
    fn withdraw(&self) -> Pin<Box<dyn Future<Output = Result<LinkDto, String>>>>;
}
