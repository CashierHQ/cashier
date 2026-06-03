import type { Principal } from "@icp-sdk/core/principal";
import type { Action, Intent, LinkType } from "$shared";

type TemplateJsonValue<T> = T extends bigint
  ? string
  : T extends Principal
    ? string
    : T extends (infer U)[]
      ? TemplateJsonValue<U>[]
      : T extends object
        ? { [K in keyof T]: TemplateJsonValue<T[K]> }
        : T;

export type IntentTemplateJson = Omit<
  TemplateJsonValue<Intent>,
  "network_fee"
> & {
  total_network_fee?: string;
};

/**
 * JSON template payload based on shared Action shape.
 * Keeps template-only fields (`link_type`, `total_network_fee`) without redefining Action by hand.
 */
export type ActionTemplateJson = Omit<TemplateJsonValue<Action>, "intents"> & {
  link_type?: LinkType;
  intents: IntentTemplateJson[];
};
