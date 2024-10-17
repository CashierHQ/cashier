import { LinkDetailModel } from "@/services/types/link.service.types";

interface LinkData {
    title: string;
    status: string;
    image: string;
    state: any;
}

export function StateBadge({ state }: { state: any }) {
    if (state === "PendingDetail") {
        return (
            <div className="text-sm text-gray-500 font-xs text-green rounded-full px-2 bg-lightyellow text-yellow">
                Pending details
            </div>
        );
    }

    if (state === "PendingPreview") {
        return (
            <div className="text-sm font-normal rounded-full px-2 bg-lightpurple text-[#3648A1]">
                Pending preview
            </div>
        );
    }

    if (state === "Active") {
        return (
            <div className="text-sm text-gray-500 font-xs text-green rounded-full px-2 bg-green text-white">
                Active
            </div>
        );
    }

    if (state === "Inactive") {
        return (
            <div className="text-sm text-gray-500 font-xs text-green rounded-full px-2 bg-gray-200 text-gray-700">
                Inactive
            </div>
        );
    }

    if (state === "New") {
        return (
            <div className="text-sm text-gray-500 font-xs text-green rounded-full px-2 bg-lightgreen">
                New
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
                <h3 className="text-lg font-base">{link.title ?? "No title"}</h3>
                <StateBadge state={link.state} />
            </div>
        </div>
    );
}
