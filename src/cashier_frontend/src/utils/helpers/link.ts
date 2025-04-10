import { LinkModel } from "@/services/types/link.service.types";

export function isLinkFullyClaimed(link: LinkModel) {
    return link.link.asset_info.every((asset) => asset.totalClaim >= asset.amount);
}
