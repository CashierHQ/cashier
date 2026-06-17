use crate::utils::{PocketIcTestContext, principal::TestUser};
use candid::Principal;
use gate_service_types::{
    Gate, GateKey, GateUserStatus, NewGate, PasswordHashingAlgorithm, auth::Permission,
};

/// Adds a password gate fixture for testing purposes.
/// # Arguments
/// * `ctx` - The test context.
/// * `creator` - The principal ID of the gate creator.
/// * `subject_id` - The subject ID for the gate.
/// * `password` - The password for the gate.
/// # Returns
/// The created password gate.
pub async fn add_password_gate_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    subject_id: &str,
    password: &str,
) -> Gate {
    let admin = TestUser::GateServiceAdmin.get_principal();
    let admin_client = ctx.new_gate_service_client(admin);
    let _user_permissions_add = admin_client
        .admin_permissions_add(creator, vec![Permission::GateCreate])
        .await
        .unwrap()
        .unwrap();

    let user_client = ctx.new_gate_service_client(creator);
    let new_gate = NewGate {
        subject_id: subject_id.to_string(),
        key: GateKey::Password(password.to_string()),
    };

    user_client.add_gate(new_gate).await.unwrap().unwrap()
}

/// Adds and opens a password gate fixture for testing purposes.
/// # Arguments
/// * `ctx` - The test context.
/// * `creator` - The principal ID of the gate creator.
/// * `subject_id` - The subject ID for the gate.
/// * `password` - The password for the gate.
/// # Returns
/// The created password gate and its user status.
pub async fn add_and_open_password_gate_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    subject_id: &str,
    password: &str,
    user: Principal,
) -> (Gate, GateUserStatus) {
    let gate = add_password_gate_fixture(ctx, creator, subject_id, password).await;
    let user_client = ctx.new_gate_service_client(user);
    let open_gate_result = user_client
        .open_gate(
            gate.id.clone(),
            GateKey::Password(password.to_string()),
            user,
        )
        .await
        .unwrap()
        .unwrap();

    (gate, open_gate_result.gate_user_status.clone())
}

/// Sets the password hashing algorithm to SHA256 and adds a password gate fixture.
/// Resets algorithm back to Argon2id after gate creation to avoid side-effects on other tests.
/// # Arguments
/// * `ctx` - The test context.
/// * `creator` - The principal ID of the gate creator.
/// * `subject_id` - The subject ID for the gate.
/// * `password` - The password for the gate.
/// # Returns
/// The created password gate (hashed with SHA256 on the backend).
pub async fn add_password_gate_sha256_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    subject_id: &str,
    password: &str,
) -> Gate {
    let admin = TestUser::GateServiceAdmin.get_principal();
    let admin_client = ctx.new_gate_service_client(admin);

    admin_client
        .admin_set_password_hashing_algorithm(PasswordHashingAlgorithm::Sha256)
        .await
        .unwrap()
        .unwrap();

    let gate = add_password_gate_fixture(ctx, creator, subject_id, password).await;

    admin_client
        .admin_set_password_hashing_algorithm(PasswordHashingAlgorithm::Argon2id)
        .await
        .unwrap()
        .unwrap();

    gate
}

/// Adds an X-following gate fixture for testing purposes.
/// # Arguments
/// * `ctx` - The test context.
/// * `creator` - The principal ID of the gate creator.
/// * `subject_id` - The subject ID for the gate.
/// * `target_handle` - The X handle that must be followed to unlock the gate.
/// # Returns
/// The created X-following gate.
pub async fn add_xfollowing_gate_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    subject_id: &str,
    target_handle: &str,
) -> Gate {
    let admin = TestUser::GateServiceAdmin.get_principal();
    let admin_client = ctx.new_gate_service_client(admin);
    let _user_permissions_add = admin_client
        .admin_permissions_add(creator, vec![Permission::GateCreate])
        .await
        .unwrap()
        .unwrap();

    // Seed a dummy Twitter API key so XFollowingVerifier can reach the HTTP outcall.
    admin_client
        .admin_plain_secret_set(
            "twitter_api_key".to_string(),
            "test_twitter_api_key".to_string(),
        )
        .await
        .expect("admin_plain_secret_set call failed")
        .expect("admin_plain_secret_set returned error");

    let user_client = ctx.new_gate_service_client(creator);
    let new_gate = NewGate {
        subject_id: subject_id.to_string(),
        key: GateKey::XFollowing(target_handle.to_string()),
    };

    user_client.add_gate(new_gate).await.unwrap().unwrap()
}

/// Adds an X-owned-account gate fixture for testing purposes.
/// # Arguments
/// * `ctx` - The test context.
/// * `creator` - The principal ID of the gate creator.
/// * `subject_id` - The subject ID for the gate.
/// * `target_handle` - The X handle that the user must own to unlock the gate.
/// # Returns
/// The created X-owned-account gate.
pub async fn add_xowned_account_gate_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    subject_id: &str,
    target_handle: &str,
) -> Gate {
    let admin = TestUser::GateServiceAdmin.get_principal();
    let admin_client = ctx.new_gate_service_client(admin);
    let _user_permissions_add = admin_client
        .admin_permissions_add(creator, vec![Permission::GateCreate])
        .await
        .unwrap()
        .unwrap();

    let user_client = ctx.new_gate_service_client(creator);
    let new_gate = NewGate {
        subject_id: subject_id.to_string(),
        key: GateKey::XOwnedAccount(target_handle.to_string()),
    };

    user_client.add_gate(new_gate).await.unwrap().unwrap()
}

/// Adds an X-liked-post gate fixture for testing purposes.
/// # Arguments
/// * `ctx` - The test context.
/// * `creator` - The principal ID of the gate creator.
/// * `subject_id` - The subject ID for the gate.
/// * `tweet_url` - The X tweet URL that must be liked to unlock the gate.
/// # Returns
/// The created X-liked-post gate.
pub async fn add_xlikedpost_gate_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    subject_id: &str,
    tweet_url: &str,
) -> Gate {
    let admin = TestUser::GateServiceAdmin.get_principal();
    let admin_client = ctx.new_gate_service_client(admin);
    let _user_permissions_add = admin_client
        .admin_permissions_add(creator, vec![Permission::GateCreate])
        .await
        .unwrap()
        .unwrap();

    let user_client = ctx.new_gate_service_client(creator);
    let new_gate = NewGate {
        subject_id: subject_id.to_string(),
        key: GateKey::XLikedPost(tweet_url.to_string()),
    };

    user_client.add_gate(new_gate).await.unwrap().unwrap()
}

/// Adds an X-retweeted-post gate fixture for testing purposes.
/// Seeds the `x_bearer_token` secret required by the retweeted-post verifier.
/// # Arguments
/// * `ctx` - The test context.
/// * `creator` - The principal ID of the gate creator.
/// * `subject_id` - The subject ID for the gate.
/// * `tweet_url` - The X tweet URL that must be retweeted to unlock the gate.
/// # Returns
/// The created X-retweeted-post gate.
pub async fn add_xretweetedpost_gate_fixture(
    ctx: &PocketIcTestContext,
    creator: Principal,
    subject_id: &str,
    tweet_url: &str,
) -> Gate {
    let admin = TestUser::GateServiceAdmin.get_principal();
    let admin_client = ctx.new_gate_service_client(admin);
    let _user_permissions_add = admin_client
        .admin_permissions_add(creator, vec![Permission::GateCreate])
        .await
        .unwrap()
        .unwrap();

    // Seed the bearer token so XRetweetedPostVerifier can reach the HTTP outcall.
    admin_client
        .admin_plain_secret_set(
            "x_bearer_token".to_string(),
            "test_x_bearer_token".to_string(),
        )
        .await
        .expect("admin_plain_secret_set call failed")
        .expect("admin_plain_secret_set returned error");

    let user_client = ctx.new_gate_service_client(creator);
    let new_gate = NewGate {
        subject_id: subject_id.to_string(),
        key: GateKey::XRetweetedPost(tweet_url.to_string()),
    };

    user_client.add_gate(new_gate).await.unwrap().unwrap()
}
