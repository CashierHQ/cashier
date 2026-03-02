/**
 * Types for ActionTemplate
 */
export type ActionTemplateJson = {
  link_type?: string;
  id: string;
  creator: string;
  creator_address_type: string;
  action_type: string;
  intents: Array<{
    id: string;
    intent_type: string;
    asset: { address: string; network_fee?: string; token_standard?: string };
    amount: string;
    total_network_fee?: string;
    user_fee?: string;
    total_amount?: string;
    source_address: string;
    source_address_type: string;
    dest_address: string;
    dest_address_type: string;
    dependencies?: string[];
    intent_state: string;
  }>;
  action_state: string;
};
