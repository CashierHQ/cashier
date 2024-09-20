// logger.rs

use ic_cdk::println;

pub fn info(message: &str) {
    println!("[INFO] {}", message);
}

pub fn warn(message: &str) {
    println!("[WARN] {}", message);
}

pub fn error(message: &str) {
    println!("[ERROR] {}", message);
}
