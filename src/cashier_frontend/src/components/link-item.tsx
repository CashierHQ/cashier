import { LINK_STATUS } from "@/constants/otherConst";
import { LINK_STATE } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";

export function StateBadge({ state }: { state: string | undefined }) {
    if (state === LINK_STATE.ADD_ASSET) {
        return (
            <div className="text-sm text-gray-500 font-xs text-green rounded-full px-2 bg-lightyellow text-yellow">
                {LINK_STATUS.PENDING_DETAIL}
            </div>
        );
    }

    if (state === LINK_STATE.CREATE_LINK) {
        return (
            <div className="text-sm font-normal rounded-full px-2 bg-lightpurple text-[#3648A1]">
                {LINK_STATUS.PENDING_PREVIEW}
            </div>
        );
    }

    if (state === LINK_STATE.ACTIVE) {
        return (
            <div className="text-sm text-gray-500 font-xs text-green rounded-full px-2 bg-green text-white">
                {LINK_STATUS.ACTIVE}
            </div>
        );
    }

    if (state === LINK_STATE.INACTIVE) {
        return (
            <div className="text-sm text-gray-500 font-xs text-green rounded-full px-2 bg-gray-200 text-gray-700">
                {LINK_STATUS.INACTIVE}
            </div>
        );
    }

    if (state === LINK_STATE.CHOOSETEMPLATE) {
        return (
            <div className="text-sm text-gray-500 font-xs text-green rounded-full px-2 bg-lightgreen">
                {LINK_STATUS.NEW}
            </div>
        );
    }
}

export default function LinkItem({ link }: { link: LinkDetailModel }) {
    return (
        <div className="w-full flex justify-between items-center my-5">
            <div className="flex gap-x-5 items-center">
                {link.image ? (
                    <img src={link.image} alt="link" className="w-10 h-10 rounded-sm" />
                ) : (
                    <div className="w-10 h-10 rounded-sm bg-gray-200"></div>
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
