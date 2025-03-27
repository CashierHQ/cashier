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
import { UserDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { useResponsive } from "@/hooks/responsive-hook";
import { LINK_STATE, LINK_TYPE } from "@/services/types/enum";
import TransactionToast from "@/components/transaction/transaction-toast";
import { TestForm } from "@/components/test-form/test-form";
import useToast from "@/hooks/useToast";
import { useUserAssets } from "@/components/link-details/tip-link-asset-form.hooks";
import Header from "@/components/header";
import { useConnectToWallet } from "@/hooks/useConnectToWallet";
import SheetWrapper from "@/components/sheet-wrapper";

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
                <div className="max-h-[60vh] md:max-h-[30%] xl:max-h-[40%] 2xl:max-h-[60%] overflow-y-auto custom-scrollbar">
                    {Object.entries(links).map(([date, items]) => (
                        <div key={date} className="my-5">
                            <h3 className="text-lightblack mb-2">{formatDateString(date)}</h3>
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
            <div className="w-screen flex justify-center py-5 h-[90%]">
                <div className="w-11/12 max-w-[400px] flex flex-col items-center">
                    <div className="w-11/12 max-w-[400px] flex flex-col items-center">
                        <Header onConnect={connectToWallet} openTestForm={connectToWallet} />

                        <div className="w-11/12 max-w-[400px] flex flex-col items-center mt-8">
                            <p className="text-yellow text-center font-semibold border-2 border-yellow p-2 mx-auto rounded-sm bg-lightyellow">
                                Cashier is still in development. Use with caution.
                            </p>
                            <span className="font-semibold mt-3 text-3xl md:text-2xl 2xl:text-3xl text-center">
                                Cashier Links - <br />
                                fast, easy, and safe{" "}
                            </span>
                            <p className="text-gray-500 text-md md:text-sm 2xl:text-md text-center mt-3">
                                Start creating transaction links with Cashier: create & airdrop
                                NFTs, and more features coming!
                            </p>
                            <img
                                src="./landingPage.png"
                                alt="Cashier illustration"
                                className="w-[100%] md:w-[20vw] 2xl:w-[100%] max-w-[300px] mt-5"
                            />
                        </div>
                    </div>
                    <Button
                        type="button"
                        onClick={connectToWallet}
                        className="fixed text-[1rem] bottom-[30px] w-[80vw] max-w-[350px] rounded-full left-1/2 -translate-x-1/2 py-5"
                    >
                        Get started
                    </Button>
                </div>
            </div>
        );
    } else {
        if (openTestForm) {
            return <TestForm onCancel={() => setOpenTestForm(false)} />;
        } else {
            return (
                <div
                    className={
                        responsive.isSmallDevice
                            ? "w-screen flex justify-center py-3 px-3"
                            : "bg-[white] h-[90%] w-[30%] flex justify-center py-5 px-5 rounded-md drop-shadow-md"
                    }
                >
                    <SheetWrapper>
                        <div
                            className={
                                responsive.isSmallDevice ? "w-11/12 max-w-[400px]" : "w-11/12"
                            }
                        >
                            <Header onConnect={connectToWallet} openTestForm={handleOpenTestForm} />
                            {showGuide && (
                                <div className="my-3">
                                    <h1 className="text-2xl font-bold">{t("home.guide.header")}</h1>
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
                            <h2 className="text-base font-semibold mt-3 mb-1">
                                Links created by me
                            </h2>
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
