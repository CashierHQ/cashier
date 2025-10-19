import { LinkState } from "../types/link/linkState";

export function statusBadge(state: LinkState) {
  const base = "text-xs font-xs rounded-full px-2 py-1";
  switch (state) {
    case LinkState.ACTIVE:
      return { text: "Active", classes: `${base} bg-emerald-600 text-white` };
    case LinkState.INACTIVE:
      return { text: "Inactive", classes: `${base} bg-gray-200 text-gray-700` };
    case LinkState.CREATE_LINK:
      return { text: "Draft", classes: `${base} bg-yellow-200 text-yellow` };
    case LinkState.INACTIVE_ENDED:
      return { text: "Ended", classes: `${base} bg-red-50 text-red-700` };
    default:
      return { text: "Unknown", classes: `${base} bg-gray-50 text-gray-700` };
  }
}
