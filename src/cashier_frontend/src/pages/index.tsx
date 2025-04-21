import { useAuth, useIdentity } from "@nfid/identitykit/react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LinkItem from "@/components/link-item";
import { Skeleton } from "@/components/ui/skeleton";
import LinkService from "@/services/link.service";
import { Button } from "@/components/ui/button";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { formatDateString } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useResponsive } from "@/hooks/responsive-hook";
import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import TransactionToast from "@/components/transaction/transaction-toast";
import useToast from "@/hooks/useToast";
import { Plus } from "lucide-react";
import { useConnectToWallet } from "@/hooks/user-hook";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { useTokens } from "@/hooks/useTokens";

export default function HomePage() {
    const { t } = useTranslation();
    const identity = useIdentity();
    const { userInputs, addUserInput } = useLinkCreationFormStore();
    const { user: walletUser } = useAuth();
    const { connectToWallet } = useConnectToWallet();
    const { data: linkData, isLoading: isLinksLoading } = useQuery({
        ...queryKeys.links.list(identity),
        enabled: !!identity,
        refetchOnWindowFocus: false,
    });

    const [showGuide, setShowGuide] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [disableCreateButton, setDisableCreateButton] = useState(false);
    const { toastData, showToast, hideToast } = useToast();
    const navigate = useNavigate();
    const responsive = useResponsive();

    const { updateTokenInit } = useTokens();

    const handleCreateLink = async () => {
        try {
            setDisableCreateButton(true);
            showToast(t("common.creating"), t("common.creatingLink"), "default");
            const linkId = await new LinkService(identity).createLink({
                link_type: LINK_TYPE.SEND_TIP,
            });
            addUserInput(linkId, {
                linkId: linkId,
                state: LINK_STATE.CHOOSE_TEMPLATE,
                title: "",
                linkType: LINK_TYPE.SEND_TIP,
                assets: [],
            });
            navigate(`/edit/${linkId}`);
        } catch {
            showToast(t("common.error"), t("common.commonErrorMessage"), "error");
        } finally {
            setDisableCreateButton(false);
        }
    };

    const handleHideGuide = () => {
        setShowGuide(false);
        localStorage.setItem("showGuide", "false");
    };

    useEffect(() => {
        if (localStorage.getItem("showGuide") === "false") {
            setShowGuide(false);
        } else {
            setShowGuide(true);
        }
    }, []);

    useEffect(() => {
        const draftLinkStates = [
            LINK_STATE.ADD_ASSET,
            LINK_STATE.CHOOSE_TEMPLATE,
            LINK_STATE.CREATE_LINK,
        ];
        if (linkData) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            Object.entries(linkData).forEach(([_date, links]) => {
                links.forEach((link) => {
                    if (draftLinkStates.includes(link.state as LINK_STATE)) {
                        if (userInputs.has(link.id)) {
                            console.log("Link: ", link);
                            // Convert BigInt values to strings before adding to store
                            // Store kept crashing otherwise if using BigInt, maybe
                            const processedAssets = link.asset_info
                                ? link.asset_info.map((asset) => ({
                                      address: asset.address,
                                      linkUseAmount: asset.amountPerUse,
                                      chain: asset.chain!,
                                      label: asset.label!,
                                  }))
                                : [];

                            addUserInput(link.id, {
                                linkId: link.id,
                                state: link.state as LINK_STATE,
                                title: link.title,
                                linkType: link.linkType as LINK_TYPE,
                                assets: processedAssets,
                            });
                        }
                    }
                });
            });
        }
    }, [linkData]);

    useEffect(() => {
        if (identity) {
            updateTokenInit();
        }
    }, [identity]);

    useEffect(() => {
        if (isLinksLoading) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
        }
    }, [isLinksLoading]);

    const renderLinkList = (links: Record<string, LinkDetailModel[]> | undefined) => {
        if (links && Object.keys(links).length > 0) {
            return (
                <div className="overflow-y-auto h-full scrollbar-hide">
                    {Object.entries(links).map(([date, items]) => (
                        <div key={date} className="my-4">
                            <h3 className="text-lightblack font-normal mb-2">
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

    const renderUnauthenticatedContent = () => (
        <>
            <p className="text-yellow text-center text-sm font-semibold border-2 border-yellow p-2 mx-auto rounded-sm bg-lightyellow mt-4 mb-2">
                Cashier is still in development.
                {responsive.isSmallDevice ? <br /> : <span> </span>}
                Use with caution.
            </p>

            <div
                className={`flex ${responsive.isSmallDevice ? "flex-col" : "flex-row gap-16 mt-[10vh]"}`}
            >
                <div
                    className={`flex flex-col w-full justify-center gap-2 ${
                        responsive.isSmallDevice ? "items-center gap-2" : "items-start gap-6 mt-4"
                    }`}
                >
                    <span
                        className={`font-semibold ${responsive.isSmallDevice ? "text-center text-3xl" : "text-left text-6xl"}`}
                    >
                        Cashier Links - <br />
                        fast, easy, and <span className="text-green">safe</span>{" "}
                    </span>
                    <span
                        className={`text-gray-500 ${
                            responsive.isSmallDevice ? "text-center text-sm" : "text-left text-base"
                        }`}
                    >
                        Start creating transaction links with Cashier:
                        <br />
                        create & airdrop NFTs, and more features coming!
                    </span>
                    {!responsive.isSmallDevice && (
                        <Button
                            type="button"
                            onClick={() => {
                                connectToWallet();
                            }}
                            className="h-11 mt-8 text-[1rem] bottom-[30px] w-[90%] max-w-[350px] rounded-full"
                        >
                            Get started
                        </Button>
                    )}
                </div>
                {/* TODO: Replace with actual component or better image, this looks blurry */}
                <img
                    src="./landingPage.png"
                    alt="Cashier illustration"
                    className={`${responsive.isSmallDevice ? "w-[100%] mt-8" : "w-[50%]"}`}
                />
            </div>
            {responsive.isSmallDevice && (
                <Button
                    type="button"
                    onClick={() => {
                        connectToWallet();
                    }}
                    className="fixed h-11 text-[1rem] bottom-[30px] w-[90%] max-w-[350px] rounded-full left-1/2 -translate-x-1/2"
                >
                    Get started
                </Button>
            )}
        </>
    );

    const renderAuthenticatedContent = () => (
        <>
            {showGuide && (
                <div className="mt-8 px-4">
                    <h1 className="text-2xl font-bold">{t("home.guide.header")}</h1>
                    <p className="text-sm text-gray-500 mt-3">{t("home.guide.body")}</p>
                    <button className="text-green text-sm font-bold mt-3" onClick={handleHideGuide}>
                        {t("home.guide.confirm")}
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
                        showGuide || !responsive.isSmallDevice ? "mt-7" : "mt-0"
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
            <TransactionToast
                open={toastData?.open ?? false}
                onOpenChange={hideToast}
                title={toastData?.title ?? ""}
                description={toastData?.description ?? ""}
                variant={toastData?.variant ?? "default"}
                duration={2000}
            />
        </>
    );

    return (
        <MainAppLayout>
            {!walletUser ? renderUnauthenticatedContent() : renderAuthenticatedContent()}
        </MainAppLayout>
    );
}
