use ic_agent::identity::BasicIdentity;
use rand::{rngs::StdRng, RngCore, SeedableRng};

pub fn generate_random_private_key() -> [u8; 32] {
    let mut rng = StdRng::from_entropy();
    let mut private_key = [0u8; 32];
    rng.fill_bytes(&mut private_key);
    private_key
}

pub fn create_random_identity() -> BasicIdentity {
    let private_key = generate_random_private_key();
    BasicIdentity::from_raw_key(&private_key)
}
