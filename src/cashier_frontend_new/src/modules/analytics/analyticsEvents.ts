/**
 * Central list of Amplitude event names.
 *
 * timestamp is NOT added to props — Amplitude sets it automatically.
 * Only logical parameters expected from the frontend are listed here.
 */
export enum AnalyticsEvent {
  // Link creation funnel
  LINK_CREATION_LANDING = "link_creation_landing",
  LINK_CREATION_LINK_LIST_LANDING = "link_creation_link_list_landing",
  LINK_CREATION_LINK_LIST_PLUS = "link_creation_link_list_plus",
  LINK_CREATION_TEMPLATE_LANDING = "link_creation_template_landing",
  LINK_CREATION_TEMPLATE_CONTINUE = "link_creation_template_continue",
  LINK_CREATION_ASSET_LANDING = "link_creation_asset_landing",
  LINK_CREATION_ASSET_CONTINUE = "link_creation_asset_continue",
  LINK_CREATION_GATE_LANDING = "link_creation_gate_landing",
  LINK_CREATION_GATE_CONTINUE = "link_creation_gate_continue",
  LINK_CREATION_PREVIEW_LANDING = "link_creation_preview_landing",
  LINK_CREATION_PREVIEW_CONTINUE = "link_creation_preview_continue",
  LINK_CREATION_CREATE_ACTION_PRESSED = "link_creation_create_action_pressed",
  LINK_CREATION_CREATE_LANDING = "link_creation_create_landing",
  LINK_CREATION_CREATE_ACTION_SUCCESS = "link_creation_create_action_success",

  // Withdraw funnel
  WITHDRAW_LINK_DETAILS = "withdraw_link_details",
  WITHDRAW_LINK_END = "withdraw_link_end",
  WITHDRAW_LANDING = "withdraw_landing",
  WITHDRAW_ACTION_SUCCESS = "withdraw_action_success",

  // Use funnel
  USE_LANDING_LOGGED_OUT = "use_landing_logged_out",
  USE_LANDING_LOGIN_LOGGED_OUT = "use_landing_login_logged_out",
  USE_LANDING_CONTINUE_LOGGED_OUT = "use_landing_continue_logged_out",
  USE_LANDING_LOGGED_IN = "use_landing_logged_in",
  USE_LANDING_CONTINUE_LOGGED_IN = "use_landing_continue_logged_in",
  USE_WALLET_PAGE_LOCKED = "use_wallet_page_locked",
  USE_WALLET_UNLOCK_LOCKED = "use_wallet_unlock_locked",
  USE_GATE_PAGE = "use_gate_page",
  USE_GATE_CONTINUE = "use_gate_continue",
  USE_WALLET_PAGE_UNLOCKED = "use_wallet_page_unlocked",
  USE_WALLET_USE_UNLOCKED = "use_wallet_use_unlocked",
  USE_ACTION_SUCCESS = "use_action_success",
}

/**
 * Expected properties per analytics event (without timestamp).
 * This is a reference: trackEvent currently accepts a generic Record,
 * but this map defines which fields must be present for each event.
 */
export type AnalyticsEventPayloadMap = {
  // Link creation funnel
  [AnalyticsEvent.LINK_CREATION_LANDING]: {
    session_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_LINK_LIST_LANDING]: {
    session_id: string;
    user_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_LINK_LIST_PLUS]: {
    session_id: string;
    user_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_TEMPLATE_LANDING]: {
    session_id: string;
    user_id: string;
    link_type: string;
    FE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_TEMPLATE_CONTINUE]: {
    session_id: string;
    user_id: string;
    link_type: string;
    FE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_ASSET_LANDING]: {
    session_id: string;
    user_id: string;
    link_type: string;
    FE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_ASSET_CONTINUE]: {
    session_id: string;
    user_id: string;
    link_type: string;
    FE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_GATE_LANDING]: {
    session_id: string;
    user_id: string;
    link_type: string;
    FE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_GATE_CONTINUE]: {
    session_id: string;
    user_id: string;
    link_type: string;
    FE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_PREVIEW_LANDING]: {
    session_id: string;
    user_id: string;
    link_type: string;
    FE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_PREVIEW_CONTINUE]: {
    session_id: string;
    user_id: string;
    link_type: string;
    FE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_CREATE_ACTION_PRESSED]: {
    session_id: string;
    user_id: string;
    link_type: string;
    FE_link_id: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_CREATE_LANDING]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.LINK_CREATION_CREATE_ACTION_SUCCESS]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };

  // Withdraw funnel
  [AnalyticsEvent.WITHDRAW_LINK_DETAILS]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.WITHDRAW_LINK_END]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.WITHDRAW_LANDING]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.WITHDRAW_ACTION_SUCCESS]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };

  // Use funnel
  [AnalyticsEvent.USE_LANDING_LOGGED_OUT]: {
    session_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_LANDING_LOGIN_LOGGED_OUT]: {
    session_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_LANDING_CONTINUE_LOGGED_OUT]: {
    session_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_LANDING_LOGGED_IN]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_LANDING_CONTINUE_LOGGED_IN]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_WALLET_PAGE_LOCKED]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_WALLET_UNLOCK_LOCKED]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_GATE_PAGE]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_GATE_CONTINUE]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_WALLET_PAGE_UNLOCKED]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_WALLET_USE_UNLOCKED]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
  [AnalyticsEvent.USE_ACTION_SUCCESS]: {
    session_id: string;
    user_id: string;
    link_type: string;
    BE_link_id: string;
  };
};