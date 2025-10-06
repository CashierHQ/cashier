import { LinkType, type CreateLinkData } from "../types";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { linkListQuery } from "$modules/links/stores/links.svelte";

export type TipLink = {
  asset: string;
  amount: number;
};

const data: CreateLinkData = $state({
  title: "",
  linkType: LinkType.TIP,
});

export const createLinkState = {
  get data() {
    return data;
  },

  set data(v: CreateLinkData) {
    data.title = v.title ?? data.title;
    data.linkType = v.linkType ?? data.linkType;
  },

  async submit() {
    try {
      const result = await cashierBackendService.createLink(data);
      if (result.isOk()) {
        // creation succeeded — reset the form and return the created link
        const created = result.unwrap();
        // reset local state
        data.title = "";
        data.linkType = LinkType.TIP;
        // refresh the link list managed state so UI updates
        try {
          linkListQuery.refresh();
        } catch {
          // ignore if refresh isn't available or fails in this environment
        }
        return { ok: true, value: created } as const;
      } else {
        return { ok: false, err: result.unwrapErr() } as const;
      }
    } catch (e) {
      return { ok: false, err: e } as const;
    }
  },

  reset() {
    data.title = "";
    data.linkType = LinkType.TIP;
  },
};

export default createLinkState;
