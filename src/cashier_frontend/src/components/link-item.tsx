import { getLinkLabel, LINK_STATE } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";

export function StateBadge({ state }: { state: string | undefined }) {
    const baseLabelClass = "text-sm font-xs rounded-full px-2";

    if (state === LINK_STATE.ADD_ASSET) {
        return (
            <div className={`${baseLabelClass} bg-lightyellow text-yellow`}>
                {getLinkLabel(LINK_STATE.ADD_ASSET)}
            </div>
        );
    }

    if (state === LINK_STATE.CHOOSE_TEMPLATE) {
        return (
            <div className={`${baseLabelClass} bg-lightpurple text-[#3648A1]`}>
                {getLinkLabel(LINK_STATE.CHOOSE_TEMPLATE)}
            </div>
        );
    }

    if (state === LINK_STATE.ACTIVE) {
        return (
            <div className={`${baseLabelClass} py-1 bg-green text-white`}>
                {getLinkLabel(LINK_STATE.ACTIVE)}
            </div>
        );
    }

    if (state === LINK_STATE.INACTIVE) {
        return (
            <div className={`${baseLabelClass} bg-gray-200 text-gray-700`}>
                {getLinkLabel(LINK_STATE.INACTIVE)}
            </div>
        );
    }

    if (state === LINK_STATE.CREATE_LINK) {
        return (
            <div className={`${baseLabelClass} text-green bg-lightgreen`}>
                {getLinkLabel(LINK_STATE.CREATE_LINK)}
            </div>
        );
    }
    return null;
}

export default function LinkItem({ link }: { link: LinkDetailModel }) {
    return (
        <div className="w-full flex justify-between items-center my-5">
            <div className="flex gap-x-5 items-center">
                {link.image ? (
                    <img src={link.image} alt="link" className="w-10 h-10 rounded-sm" />
                ) : (
                    <img src="/icpToken.png" alt="link" className="w-10 h-10 rounded-sm" />
                )}
            </div>
            <div className="flex items-center justify-between grow ml-3">
                <h3 className="text-lg font-base">
                    {link.title.length > 0 ? link.title : "No title"}
                </h3>
                <StateBadge state={link.state} />
            </div>
        </div>
    );
}
