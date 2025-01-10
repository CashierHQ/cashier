use super::transaction::Transaction;

pub type ParallelRequests = Vec<Transaction>;

pub type SequenceRequest = Vec<ParallelRequests>;

pub type IcrcxRequests = SequenceRequest;
