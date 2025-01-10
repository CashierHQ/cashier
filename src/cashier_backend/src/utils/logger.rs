// logger.rs

#[macro_export]
macro_rules! info {
    ($($arg:tt)*) => ({
        ic_cdk::println!("[INFO] {}", format!($($arg)*));
    })
}

#[macro_export]
macro_rules! warn {
    ($($arg:tt)*) => ({
        ic_cdk::println!("[WARN] {}", format!($($arg)*));
    })
}

#[macro_export]
macro_rules! error {
    ($($arg:tt)*) => ({
        ic_cdk::println!("[ERROR] {}", format!($($arg)*));
    })
}
