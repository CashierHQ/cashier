export type LinkStateLike = { id: string } | undefined;

export function statusBadge(state: LinkStateLike) {
  const id = state?.id;
  switch (id) {
    case "ACTIVE":
      return { text: "Active", classes: "bg-emerald-50 text-emerald-700" };
    case "INACTIVE":
      return { text: "Inactive", classes: "bg-gray-100 text-gray-700" };
    case "CREATE_LINK":
      return { text: "Draft", classes: "bg-blue-50 text-blue-700" };
    case "INACTIVE_ENDED":
      return { text: "Ended", classes: "bg-red-50 text-red-700" };
    default:
      return { text: "Unknown", classes: "bg-gray-50 text-gray-700" };
  }
}
