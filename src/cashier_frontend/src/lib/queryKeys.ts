// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import LinkService from "@/services/link/link.service";
import { LinkGetUserStateInputModel } from "@/services/types/link.service.types";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { createQueryKeyStore } from "@lukemorales/query-key-factory";

const QUERY_KEYS = {
  LINKS: "links",
};

export const queryKeys = createQueryKeyStore({
  links: {
    userState: (
      input: LinkGetUserStateInputModel,
      identity: Identity | PartialIdentity | undefined,
    ) => ({
      queryKey: [QUERY_KEYS.LINKS, input.link_id, input.action_type],
      queryFn: async () => {
        try {
          const linkService = new LinkService(identity);
          const userState = await linkService.getLinkUserState(input);
          return userState;
        } catch (error) {
          console.log("🚀 ~ queryFn: ~ error:", error);
          throw error;
        }
      },
    }),
  },
});
