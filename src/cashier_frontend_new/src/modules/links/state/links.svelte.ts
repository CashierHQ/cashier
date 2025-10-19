import { managedState } from "$lib/managedState";
import { cashierBackendService } from "../services/cashierBackend";
import { Link } from "../types/link/link";

// A state for the user tokens list
export const linkListQuery = managedState<Link[]>({
  queryFn: async () => {
    const backendLinks = (await cashierBackendService.getLinks()).unwrap();
    const links = backendLinks.map((b) => Link.fromBackend(b));
    return links;
  },
  watch: true,
});
