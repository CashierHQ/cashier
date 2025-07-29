// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use cashier_types::keys::RateLimitKey;
use cashier_types::rate_limit::{RateLimitEntry, RateLimitIdentifier};

use crate::{
    repositories::rate_limit::RateLimitRepository, types::error::CanisterError,
    utils::runtime::IcEnvironment,
};

/// Time window duration enum for different rate limiting periods
#[derive(Clone, Copy, Debug)]
pub enum TimeWindow {
    Minutes(u32), // e.g., Minutes(10) for 10-minute windows
    Hours(u32),   // e.g., Hours(1) for 1-hour windows
    Days(u32),    // e.g., Days(1) for 1-day windows
}

impl TimeWindow {
    fn to_seconds(&self) -> u64 {
        match self {
            TimeWindow::Minutes(m) => *m as u64 * 60,
            TimeWindow::Hours(h) => *h as u64 * 3600,
            TimeWindow::Days(d) => *d as u64 * 86400,
        }
    }
}

#[derive(Clone)]
pub struct RateLimitService<T: IcEnvironment> {
    rate_limit_repository: RateLimitRepository,
    #[allow(dead_code)]
    ic_env: T,
}

impl<T: IcEnvironment> RateLimitService<T> {
    pub fn new(ic_env: T) -> Self {
        Self {
            rate_limit_repository: RateLimitRepository::new(),
            ic_env,
        }
    }

    pub fn get_instance() -> Self {
        Self::new(T::new())
    }

    /// Get a time window start timestamp for the given time and window duration
    /// Returns the timestamp of the start of the time window
    ///
    /// Examples:
    /// - Current time: 10:13, Window: 10 minutes -> Returns: 10:10
    /// - Current time: 10:13, Window: 1 hour -> Returns: 10:00  
    /// - Current time: 10:13, Window: 1 day -> Returns: 00:00 (start of day)
    fn get_time_window_start(&self, time_ns: u64, window: TimeWindow) -> u64 {
        // Convert nanoseconds to seconds
        let time_seconds = time_ns / 1_000_000_000;
        let window_seconds = window.to_seconds();

        match window {
            TimeWindow::Days(_) => {
                // For daily windows, align to day boundaries
                // For multi-day windows (e.g., 2 days), find intervals of that size
                let day_intervals = time_seconds / window_seconds;
                day_intervals * window_seconds * 1_000_000_000
            }
            TimeWindow::Hours(_) => {
                // For hourly windows, align to the start of the hour (XX:00:00)
                let hour_intervals = time_seconds / window_seconds;
                hour_intervals * window_seconds * 1_000_000_000
            }
            TimeWindow::Minutes(_) => {
                // For minute windows, align to the start of the minute interval
                let minute_intervals = time_seconds / window_seconds;
                minute_intervals * window_seconds * 1_000_000_000
            }
        }
    }

    /// Apply rate limiting with predefined configurations for specific API methods
    /// This method contains hardcoded rate limits as per the API specification
    pub fn try_process_api(&self, user_principal: &str, method: &str) -> Result<(), CanisterError> {
        match method {
            // User principal based rate limits (5 requests per 10 minutes)
            "create_link" => {
                self.try_process_with_window(user_principal, method, 5, TimeWindow::Minutes(10))
            }
            "create_action" => {
                self.try_process_with_window(user_principal, method, 5, TimeWindow::Minutes(10))
            }
            "process_action" => {
                self.try_process_with_window(user_principal, method, 5, TimeWindow::Minutes(10))
            }
            "update_action" => {
                self.try_process_with_window(user_principal, method, 5, TimeWindow::Minutes(10))
            }
            _ => Err(CanisterError::HandleLogicError(format!(
                "Unknown method: {}",
                method
            ))),
        }
    }

    /// Process with custom rate limit and time window
    pub fn try_process_with_window(
        &self,
        user_principal: &str,
        method: &str,
        max_requests: u32,
        window: TimeWindow,
    ) -> Result<(), CanisterError> {
        if max_requests == 0 {
            return Err(CanisterError::HandleLogicError(format!(
                "Rate limit cannot be zero for user {} on method {}",
                user_principal, method
            )));
        }

        let time_nano_sec = self.ic_env.time();
        let time_window_start = self.get_time_window_start(time_nano_sec, window);

        let key = RateLimitKey {
            identifier: RateLimitIdentifier::UserPrincipal(user_principal.to_string()),
            method: method.to_string(),
            time_windows: time_window_start,
        };

        // Calculate the end time for the current time window
        let end_time_ns = time_window_start + (window.to_seconds() * 1_000_000_000);

        // Check if we have an existing rate limit entry
        if let Some(entry) = self.rate_limit_repository.get(&key) {
            // Check if the current time window has expired
            if time_nano_sec >= entry.end_time {
                // Time window expired, create a new entry
                let new_entry = RateLimitEntry {
                    end_time: end_time_ns,
                    count: 1,
                };
                self.rate_limit_repository.update(key, new_entry);
            } else {
                // Still in the same time window, check if limit exceeded
                if entry.count >= max_requests as u64 {
                    let remaining_time_ns = entry.end_time - time_nano_sec;
                    let remaining_time_ms = remaining_time_ns / 1_000_000;
                    let window_description = match window {
                        TimeWindow::Minutes(m) => format!("{} minutes", m),
                        TimeWindow::Hours(h) => format!("{} hours", h),
                        TimeWindow::Days(d) => format!("{} days", d),
                    };
                    return Err(CanisterError::HandleLogicError(format!(
                        "Rate limit exceeded for user {} on method {}. Limit: {} requests per {}. Try again after {} ms.",
                        user_principal,
                        method,
                        max_requests,
                        window_description,
                        remaining_time_ms
                    )));
                } else {
                    // Update existing entry by incrementing count
                    let updated_entry = RateLimitEntry {
                        end_time: entry.end_time, // Keep the same end time
                        count: entry.count + 1,
                    };
                    self.rate_limit_repository.update(key, updated_entry);
                }
            }
        } else {
            // No existing entry, create a new one
            let new_entry = RateLimitEntry {
                end_time: end_time_ns,
                count: 1,
            };
            self.rate_limit_repository.insert(key, new_entry);
        }

        Ok(())
    }

    // === Maintenance Methods ===

    /// Clean up expired rate limit entries to prevent memory buildup
    /// Removes all entries where the current time has passed the end_time
    pub fn clean_old_time_windows(&self) -> Vec<(String, RateLimitEntry)> {
        let current_time_ns = self.ic_env.time();
        self.rate_limit_repository.cleanup_expired(current_time_ns)
    }
}

#[cfg(test)]
pub mod __tests__;
