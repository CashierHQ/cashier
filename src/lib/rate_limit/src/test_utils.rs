pub struct Time {
    seconds: u64,
}

impl Time {
    pub fn init() -> Self {
        // Thursday, 14 August 2025 16:00:00
        Self {
            seconds: 1755187200,
        }
    }

    pub fn next_window(&mut self, window_size: u64) -> u64 {
        self.seconds += window_size;
        self.seconds
    }

    pub fn advance(&mut self, seconds: u64) -> u64 {
        self.seconds += seconds;
        self.seconds
    }

    pub fn now(&self) -> u64 {
        self.seconds
    }

    pub fn past(&mut self, seconds: u64) -> u64 {
        self.seconds -= seconds;
        self.seconds
    }
}
