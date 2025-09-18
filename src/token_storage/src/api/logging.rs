use ic_cdk::query;
use ic_mple_log::{take_memory_records, writer::Logs};
use token_storage_types::error::TokenStorageError;

/// Gets the application logs
/// - `count` is the number of logs to return
/// - `offset` is the offset from the first log to return
#[query]
pub fn ic_logs(count: usize, offset: usize) -> Result<Logs, TokenStorageError> {
    // 1.6MB limit
    const MAX_SIZE: usize = 1024 * 1024 + (1024 * 600);

    let base_log_size = std::mem::size_of::<ic_mple_log::writer::Log>();

    let mut logs = Vec::new();
    let mut total_size = std::mem::size_of::<Logs>();

    let all_logs = take_memory_records(count, offset);
    for log in all_logs.logs {
        let log_entry_size = base_log_size + log.log.len();

        if total_size + log_entry_size <= MAX_SIZE {
            logs.push(log);
            total_size += log_entry_size;
        } else {
            break;
        }
    }

    Ok(Logs {
        logs,
        all_logs_count: all_logs.all_logs_count,
    })
}
