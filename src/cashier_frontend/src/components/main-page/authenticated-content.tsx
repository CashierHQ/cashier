// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import LinkItem from "@/components/link-item";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { LINK_STATE } from "@/services/types/enum";
import { useDeviceSize } from "@/hooks/responsive-hook";
import { formatDateString } from "@/utils";

interface AuthenticatedContentProps {
    showGuide: boolean;
    handleHideGuide: () => void;
    disableCreateButton: boolean;
    handleCreateLink: () => void;
    isLoading: boolean;
    linkData?: Record<string, LinkDetailModel[]>;
    resetLinkAndAction: () => void;
}

export const AuthenticatedContent = ({
    showGuide,
    handleHideGuide,
    disableCreateButton,
    handleCreateLink,
    isLoading,
    linkData,
    resetLinkAndAction,
}: AuthenticatedContentProps) => {
    const { t } = useTranslation();
    const responsive = useDeviceSize();

    const renderLinkList = (links: Record<string, LinkDetailModel[]> | undefined) => {
        if (links && Object.keys(links).length > 0) {
            return (
                <div className="overflow-y-auto h-full scrollbar-hide pb-20">
                    {Object.entries(links).map(([date, items]) => (
                        <div key={date} className="my-4">
                            <h3 className="text-lightblack/80 font-normal mb-2 text-[14px]">
                                {formatDateString(date)}
                            </h3>
                            <ul>
                                {items.map((item) => (
                                    <Link
                                        to={
                                            item.state === LINK_STATE.ACTIVE ||
                                            item.state === LINK_STATE.INACTIVE ||
                                            item.state === LINK_STATE.INACTIVE_ENDED
                                                ? `/details/${item.id}`
                                                : `/edit/${item.id}`
                                        }
                                        key={item.id}
                                        onClick={() => {
                                            resetLinkAndAction();
                                        }}
                                    >
                                        <LinkItem key={item.id} link={item} />
                                    </Link>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            );
        } else {
            return (
                <>
                    <p className="text-sm text-gray-500 mt-3">There is no links yet.</p>
                </>
            );
        }
    };

    return (
        <>
            {showGuide && (
                <div className="px-4 pb-4">
                    <h1 className="text-2xl font-bold">{t("home.guide.header")}</h1>
                    <p className="text-sm text-gray-500 mt-3">{t("home.guide.body")}</p>
                    <button className="text-green text-sm font-bold mt-3" onClick={handleHideGuide}>
                        {t("home.guide.confirm")}!
                    </button>
                </div>
            )}
            <div
                className={`flex flex-col px-4 w-full ${
                    showGuide ? "h-[calc(100dvh-280px)]" : "h-full"
                }`}
            >
                <h2
                    className={`text-base font-semibold ${
                        showGuide || !responsive.isSmallDevice ? "mt-0" : "mt-0"
                    }`}
                >
                    Links created by me
                </h2>
                <div
                    className={`flex flex-col overflow-y-hidden ${responsive.isSmallDevice ? "h-full" : "h-full"}`}
                >
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, index) => (
                              <div className="flex items-center space-x-4 my-3" key={index}>
                                  <Skeleton className="h-10 w-10 rounded-sm" />
                                  <div className="space-y-2">
                                      <Skeleton className="h-3 w-[75vw] max-w-[320px]" />
                                      <Skeleton className="h-3 w-[200px]" />
                                  </div>
                              </div>
                          ))
                        : renderLinkList(linkData)}
                </div>
            </div>
            <button
                className={`fixed flex items-center justify-center bottom-[30px] right-[30px] text-[2rem] rounded-full w-[3rem] h-[3rem] border-2 border-white ${
                    disableCreateButton
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green hover:bg-green/90"
                } text-white`}
                onClick={handleCreateLink}
                disabled={disableCreateButton}
            >
                <Plus strokeWidth={3} />
            </button>
        </>
    );
};
