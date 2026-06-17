// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XFollowingResponse {
    pub status: String,
    pub message: String,
    pub data: FollowStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FollowStatus {
    pub following: bool,
    pub followed_by: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthTokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub token_type: String,
    pub expires_in: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XProfileResponse {
    pub data: XProfileData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XProfileData {
    pub id: String,
    pub name: String,
    pub username: String,
    pub profile_image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XTweetsResponse {
    pub data: Option<Vec<XTweetItem>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XTweetItem {
    pub id: String,
    pub referenced_tweets: Option<Vec<XReferencedTweet>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XReferencedTweet {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String,
}
