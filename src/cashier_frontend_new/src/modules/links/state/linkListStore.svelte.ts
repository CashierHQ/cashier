import { managedState } from "$lib/managedState";
import { cashierBackendService } from "../services/cashierBackend";
import { Link } from "../types/link/link";

// A state for the user tokens list
export const linkListStore = managedState<Link[]>({
  queryFn: async () => {
    const res = await cashierBackendService.getLinks();
    if (res.isErr()) {
      throw res.unwrapErr();
    }
    const links = res.unwrap().map((b) => Link.fromBackend(b));
    return links;
  },
  watch: true,
});
