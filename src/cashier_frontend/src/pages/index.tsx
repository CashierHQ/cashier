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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useUpdateLink } from "@/hooks/linkHooks";
import { useResponsive } from "@/hooks/responsive-hook";
import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import TransactionToast from "@/components/transaction/transaction-toast";
import { TestForm } from "@/components/test-form/test-form";
import useToast from "@/hooks/useToast";
import { useUserAssets } from "@/components/link-details/tip-link-asset-form.hooks";
import Header from "@/components/header";
import { useConnectToWallet } from "@/hooks/useConnectToWallet";
import SheetWrapper from "@/components/sheet-wrapper";
import { useTokens } from "@/hooks/useTokens";

export default function HomePage() {
    const { t } = useTranslation();
    const identity = useIdentity();
    const { user: walletUser } = useAuth();
    const { connectToWallet, appUser, isUserLoading } = useConnectToWallet();

    const {
        data: linkData,
        isLoading: isLinksLoading,
        refetch: refetchLinks,
    } = useQuery({
        ...queryKeys.links.list(identity),
        enabled: !!appUser,
        refetchOnWindowFocus: false,
    });
    const queryClient = useQueryClient();
    useUserAssets();
    const { isPending } = useUpdateLink(queryClient, identity);

    const [showGuide, setShowGuide] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [disableCreateButton, setDisableCreateButton] = useState(false);
    const [openTestForm, setOpenTestForm] = useState(false);
    const { toastData, showToast, hideToast } = useToast();
    const navigate = useNavigate();
    const responsive = useResponsive();

    useTokens();

    /* TODO:: Remove after complete testing */
    const handleOpenTestForm = () => {
        setOpenTestForm(true);
    };

    const handleCreateLink = async () => {
        const linkList = linkData ? Object.values(linkData).flat() : [];
        const newLink = linkList.find((link) => link.state === LINK_STATE.CHOOSE_TEMPLATE);
        if (newLink) {
            navigate(`/edit/${newLink.id}`);
        } else {
            try {
                setDisableCreateButton(true);
                showToast(t("common.creating"), t("common.creatingLink"), "default");
                const response = await new LinkService(identity).createLink({
                    link_type: LINK_TYPE.TIP_LINK,
                });
                navigate(`/edit/${response}`);
            } catch {
                showToast(t("common.error"), t("common.commonErrorMessage"), "error");
            } finally {
                setDisableCreateButton(true);
            }
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
        if (identity && appUser) {
            refetchLinks();
        }
    }, [identity, appUser]);

    useEffect(() => {
        if (isUserLoading || isLinksLoading || isPending) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
        }
    }, [isUserLoading, isLinksLoading, isPending]);

    const renderLinkList = (links: Record<string, LinkDetailModel[]> | undefined) => {
        if (links && Object.keys(links).length > 0) {
            return (
                <div className="overflow-y-auto custom-scrollbar">
                    {Object.entries(links).map(([date, items]) => (
                        <div key={date} className="my-4">
                            <h3 className="text-lightblack font-normal mb-2">
                                {formatDateString(date)}
                            </h3>
                            <ul>
                                {items.map((item) => (
                                    <Link
                                        to={
                                            item.state === LINK_STATE.ACTIVE
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

    if (!walletUser) {
        return (
            <div className="w-screen flex justify-center py-5 h-full">
                <div className="flex w-full flex-col items-center gap-4">
                    <Header onConnect={connectToWallet} openTestForm={connectToWallet} />
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
                                responsive.isSmallDevice
                                    ? "items-center gap-2"
                                    : "items-start gap-6 mt-4"
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
                                    responsive.isSmallDevice
                                        ? "text-center text-sm"
                                        : "text-left text-base"
                                }`}
                            >
                                Start creating transaction links with Cashier:
                                <br />
                                create & airdrop NFTs, and more features coming!
                            </span>
                            {!responsive.isSmallDevice && (
                                <Button
                                    type="button"
                                    onClick={connectToWallet}
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
                </div>
                {responsive.isSmallDevice && (
                    <Button
                        type="button"
                        onClick={connectToWallet}
                        className="fixed h-11 text-[1rem] bottom-[30px] w-[90%] max-w-[350px] rounded-full left-1/2 -translate-x-1/2"
                    >
                        Get started
                    </Button>
                )}
            </div>
        );
    } else {
        if (openTestForm) {
            return <TestForm onCancel={() => setOpenTestForm(false)} />;
        } else {
            return (
                <div
                    className={`w-screen flex justify-center py-5 h-full ${responsive.isSmallDevice ? "" : "bg-lightgreen"}`}
                >
                    <SheetWrapper>
                        <div className="flex w-full flex-col">
                            <Header onConnect={connectToWallet} openTestForm={handleOpenTestForm} />
                            <div
                                className={`flex h-full min-w-[50%] flex-col ${responsive.isSmallDevice ? "px-2 py-4 h-full" : "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}
                            >
                                {showGuide && (
                                    <div className="mt-8 px-4">
                                        <h1 className="text-2xl font-bold">
                                            {t("home.guide.header")}
                                        </h1>
                                        <p className="text-sm text-gray-500 mt-3">
                                            {t("home.guide.body")}
                                        </p>
                                        <button
                                            className="text-green text-sm font-bold mt-3"
                                            onClick={handleHideGuide}
                                        >
                                            {t("home.guide.confirm")}
                                        </button>
                                    </div>
                                )}
                                <div className="flex flex-col px-4">
                                    <h2 className="text-base font-semibold mt-7">
                                        Links created by me
                                    </h2>
                                    {isLoading
                                        ? Array.from({ length: 5 }).map((_, index) => (
                                              <div
                                                  className="flex items-center space-x-4 my-3"
                                                  key={index}
                                              >
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
                        </div>
                        <button
                            className={`fixed bottom-[30px] right-[30px] text-[2rem] rounded-full w-[3rem] h-[3rem] ${
                                disableCreateButton
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-green hover:bg-green/90"
                            } text-white`}
                            onClick={handleCreateLink}
                            disabled={disableCreateButton}
                        >
                            +
                        </button>
                        <TransactionToast
                            open={toastData?.open ?? false}
                            onOpenChange={hideToast}
                            title={toastData?.title ?? ""}
                            description={toastData?.description ?? ""}
                            variant={toastData?.variant ?? "default"}
                        />
                    </SheetWrapper>
                </div>
            );
        }
    }
}
