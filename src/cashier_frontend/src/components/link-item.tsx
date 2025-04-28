import { useResponsive } from "@/hooks/responsive-hook";
import { LOCAL_lINK_ID_PREFIX } from "@/services/link/link-local-storage.service";
import { getLinkLabel, LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { getLinkDefaultAvatar } from "@/utils";

export function StateBadge({ state }: { state: string | undefined }) {
    const baseLabelClass = "text-xs font-xs rounded-full px-2 py-1";

    if (state === LINK_STATE.ADD_ASSET) {
        return (
            <div className={`${baseLabelClass} bg-lightyellow text-yellow`}>
                {getLinkLabel(LINK_STATE.ADD_ASSET)}
            </div>
        );
    }

    if (state === LINK_STATE.CHOOSE_TEMPLATE) {
        return (
            <div className={`${baseLabelClass} bg-lightyellow text-yellow`}>
                {getLinkLabel(LINK_STATE.CHOOSE_TEMPLATE)}
            </div>
        );
    }

    if (state === LINK_STATE.ACTIVE) {
        return (
            <div className={`${baseLabelClass} bg-green text-white`}>
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

    if (state === LINK_STATE.INACTIVE_ENDED) {
        return (
            <div className={`${baseLabelClass} bg-gray-200 text-gray-700`}>
                {getLinkLabel(LINK_STATE.INACTIVE_ENDED)}
            </div>
        );
    }

    if (state === LINK_STATE.CREATE_LINK) {
        return (
            <div className={`${baseLabelClass} text-yellow bg-lightyellow`}>
                {getLinkLabel(LINK_STATE.CREATE_LINK)}
            </div>
        );
    }
    return null;
}

export default function LinkItem({ link }: { link: LinkDetailModel }) {
    const responsive = useResponsive();

    const isLocalLink = link.id.startsWith(LOCAL_lINK_ID_PREFIX);

    return (
        <div
            className={`w-full flex justify-between items-center my-3 ${responsive.isSmallDevice ? "" : "p-2 hover:bg-gray-50 rounded-2xl"}`}
        >
            <div className="flex gap-x-5 items-center">
                {link.image ? (
                    <img src={link.image} alt="link" className="w-8 h-8 rounded-sm" />
                ) : (
                    <img
                        src={getLinkDefaultAvatar(
                            (link.linkType as LINK_TYPE) ?? LINK_TYPE.SEND_TIP,
                        )}
                        alt="link"
                        className="w-8 h-8 rounded-sm"
                    />
                )}
            </div>
            <div className="flex items-center justify-between grow ml-3">
                <h3 className="font-base text-sm font-[500]">
                    {link.title.length > 0 ? link.title : "No title"}
                    {isLocalLink && (
                        <span className="text-xs text-gray-500"> (Local Link) {link.state}</span>
                    )}
                </h3>
                <StateBadge state={link.state} />
            </div>
        </div>
    );
}
