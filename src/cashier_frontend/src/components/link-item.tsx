// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useDeviceSize } from "@/hooks/responsive-hook";
import { getLinkLabel, LINK_STATE, LINK_TYPE, mapStringToLinkState } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { getLinkDefaultAvatar } from "@/utils";

const STATE_ORDER_ARRAY = [
    LINK_STATE.ADD_ASSET,
    LINK_STATE.CHOOSE_TEMPLATE,
    LINK_STATE.PREVIEW,
    LINK_STATE.CREATE_LINK,
    LINK_STATE.ACTIVE,
    LINK_STATE.INACTIVE,
    LINK_STATE.INACTIVE_ENDED,
];

export function StateBadge({ state }: { state: string | undefined }) {
    if (!state) return null;
    const baseLabelClass = "text-xs font-xs rounded-full px-2 py-1";

    const linkState = mapStringToLinkState(state);

    // Get state index from order array
    const stateIndex = state ? STATE_ORDER_ARRAY.indexOf(linkState) : -1;

    // If state <= 3 return similar style as add asset (yellow background)
    if (stateIndex >= 0 && stateIndex <= 3) {
        return (
            <div className={`${baseLabelClass} bg-lightyellow text-yellow`}>
                {getLinkLabel(linkState)}
            </div>
        );
    }

    // Success state == 4 (ACTIVE)
    if (stateIndex === 4) {
        return (
            <div className={`${baseLabelClass} bg-green text-white`}>{getLinkLabel(linkState)}</div>
        );
    }

    // Inactive states > 4
    if (stateIndex > 4) {
        return (
            <div className={`${baseLabelClass} bg-gray-200 text-gray-700`}>
                {getLinkLabel(linkState)}
            </div>
        );
    }

    return null;
}

export default function LinkItem({ link }: { link: LinkDetailModel }) {
    const responsive = useDeviceSize();

    return (
        <div
            className={`w-full flex justify-between items-center my-3 ${responsive.isSmallDevice ? "" : "p-2 hover:bg-gray-50 rounded-2xl"}`}
        >
            <div className="flex gap-x-5 items-center">
                {link.image ? (
                    <img src={link.image} alt="link" className="w-8 h-8 rounded-sm" />
                ) : (
                    <div className="flex items-center justify-center w-[32px] h-[32px] bg-[#E8F2EE] rounded-[6px]">
                        <img
                            src={getLinkDefaultAvatar(
                                (link.linkType as LINK_TYPE) ?? LINK_TYPE.SEND_TIP,
                            )}
                            alt="link"
                            className="w-18 h-18 rounded-sm"
                        />
                    </div>
                )}
            </div>
            <div className="flex items-center justify-between grow ml-3">
                <div className="flex flex-col items-start justify-center">
                    <h3 className="text-[14px] font-medium">
                        {link.title.length > 0 ? link.title : "No title"}
                    </h3>
                    {/* <p className="text-[11px] text-grey-400 font-light">
                        {getClaimStatus(link.useActionCounter, link.maxActionNumber)}
                    </p> */}
                </div>
                <StateBadge state={link.state} />
            </div>
        </div>
    );
}
