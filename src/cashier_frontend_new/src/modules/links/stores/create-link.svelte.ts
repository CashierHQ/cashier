import { LinkType, type CreateLinkData } from "../types";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { linkListQuery } from "$modules/links/stores/links.svelte";
import { Err, Ok, type Result } from "ts-results-es";
import type { LinkDto } from "$lib/generated/cashier_backend/cashier_backend.did";

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

  async createLink(): Promise<Result<LinkDto, Error>> {
    try {
      const result = await cashierBackendService.createLink(data);
      if (result.isOk()) {
        // creation succeeded — reset the form and return the created link
        const created = result.unwrap();
        // refresh the link list managed state so UI updates
        linkListQuery.refresh();
        return Ok(created);
      } else {
        // creation failed — return the error
        return result;
      }
    } catch (e) {
      return Err(e as Error);
    }
  },

  reset() {
    data.title = "";
    data.linkType = LinkType.TIP;
  },
};

export default createLinkState;
