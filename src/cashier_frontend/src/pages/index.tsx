import { ConnectWalletButton, useAuth, useIdentity } from "@nfid/identitykit/react";
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
import UserService from "@/services/user.service";
import { SERVICE_CALL_ERROR } from "@/constants/serviceErrorMessage";
import { User } from "../../../declarations/cashier_backend/cashier_backend.did";
import { useResponsive } from "@/hooks/responsive-hook";
import { LINK_STATE } from "@/services/types/enum";
import { RiMenu2Line } from "react-icons/ri";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import AppSidebar from "@/components/app-sidebar";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import ConnectedWalletDropdownIcon from "@/components/connected-wallet-icon";
import TransactionToast, { TransactionToastProps } from "@/components/transaction-toast";

export default function HomePage() {
    const { t } = useTranslation();
    const identity = useIdentity();
    const { connect, user: walletUser, disconnect } = useAuth();
    const [newAppUser, setNewAppUser] = useState<User>();
    const {
        data: appUser,
        isLoading: isUserLoading,
        error: loadUserError,
        refetch: refetchAppUser,
    } = useQuery({
        ...queryKeys.users.detail(identity),
        retry: 1,
        enabled: !!identity,
    });
    const {
        data: linkData,
        isLoading: isLinksLoading,
        refetch: refetchLinks,
    } = useQuery({
        ...queryKeys.links.list(identity),
        enabled: !!appUser,
    });
    const queryClient = useQueryClient();
    const { isPending } = useUpdateLink(queryClient, identity);

    const [showGuide, setShowGuide] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [disableCreateButton, setDisableCreateButton] = useState(false);
    const [openDocumentDialog, setOpenDocumentDialog] = useState(false);
    const [documentUrl, setDocumentUrl] = useState("");
    const [toastData, setToastData] = useState<TransactionToastProps | null>(null);
    const navigate = useNavigate();
    const responsive = useResponsive();

    const connectToWallet = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        connect();
    };

    const handleCreateLink = async () => {
        try {
            setDisableCreateButton(true);
            setToastData({
                open: true,
                title: t("common.creating"),
                description: t("common.creatingLink"),
                variant: "default",
            });
            const response = await new LinkService(identity).createLink({
                link_type: { TipLink: null },
            });
            navigate(`/edit/${response}`);
        } catch {
            setToastData({
                open: true,
                title: t("common.error"),
                description: t("common.commonErrorMessage"),
                variant: "default",
            });
        } finally {
            setDisableCreateButton(true);
        }
    };

    const handleMenuClick = (docSource: string) => {
        setDocumentUrl(docSource);
        setOpenDocumentDialog(true);
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
        if (newAppUser) {
            refetchAppUser();
        }
    }, [newAppUser]);

    // If users is not exist in Cashier App,
    // then create account for them
    useEffect(() => {
        const createUser = async () => {
            const userService = new UserService(identity);
            try {
                const user = await userService.createUser();
                setNewAppUser(user);
            } catch (error) {
                console.log("🚀 ~ createUser ~ error:", error);
            }
        };

        if (
            identity &&
            !appUser &&
            loadUserError?.message.toLowerCase().includes(SERVICE_CALL_ERROR.USER_NOT_FOUND)
        ) {
            createUser();
        } else if (identity && appUser) {
            refetchLinks();
        }
    }, [identity, appUser, loadUserError]);

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
                <div className="max-h-[60%] md:max-h-[30%] xl:max-h-[40%] 2xl:max-h-[60%] overflow-y-auto custom-scrollbar">
                    {Object.entries(links).map(([date, items]) => (
                        <div key={date} className="mb-3">
                            <h3 className="text-lightblack">{formatDateString(date)}</h3>
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
            return Array.from({ length: 5 }).map((_, index) => (
                <div className="flex items-center space-x-4 my-3" key={index}>
                    <Skeleton className="h-10 w-10 rounded-sm" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-[75vw] max-w-[320px]" />
                        <Skeleton className="h-3 w-[200px]" />
                    </div>
                </div>
            ));
        }
    };

    if (!walletUser) {
        return (
            <div className="w-screen flex justify-center py-5 h-[90%]">
                <div className="w-11/12 max-w-[400px] flex flex-col items-center">
                    <div className="w-full flex justify-between items-center">
                        <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                        <ConnectWalletButton
                            onClick={connectToWallet}
                            className="bg-green text-primary-foreground shadow hover:bg-green/90"
                        >
                            Get started
                        </ConnectWalletButton>
                    </div>

                    <div className="w-11/12 max-w-[400px] flex flex-col items-center mt-8">
                        <p className="text-yellow text-center font-semibold border-2 border-yellow p-2 mx-auto rounded-sm bg-lightyellow">
                            Cashier is still in development. Use with caution.
                        </p>
                        <span className="font-semibold mt-3 text-3xl md:text-2xl 2xl:text-3xl text-center">
                            Cashier Links - <br />
                            fast, easy, and safe{" "}
                        </span>
                        <p className="text-gray-500 text-md md:text-sm 2xl:text-md text-center mt-3">
                            Start creating transaction links with Cashier: create & airdrop NFTs,
                            and more features coming!
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
        );
    } else {
        return (
            <div
                className={
                    responsive.isSmallDevice
                        ? "w-screen flex justify-center py-3"
                        : "bg-[white] h-[90%] w-[30%] flex justify-center py-5 px-5 rounded-md drop-shadow-md"
                }
            >
                <Sheet>
                    <div className={responsive.isSmallDevice ? "w-11/12 max-w-[400px]" : "w-11/12"}>
                        <div className="w-full flex justify-between items-center">
                            <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                            <div className="ml-auto mr-3">
                                <ConnectedWalletDropdownIcon
                                    connectedAccount={walletUser.principal.toString()}
                                    disconnect={disconnect}
                                />
                            </div>

                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="rounded-sm">
                                    <RiMenu2Line />
                                </Button>
                            </SheetTrigger>
                        </div>
                        {showGuide && (
                            <div className="my-3">
                                <h1 className="text-2xl font-bold">{t("home.guide.header")}</h1>
                                <p className="text-sm text-gray-500 mt-3">{t("home.guide.body")}</p>
                                <button
                                    className="text-green text-sm font-bold mt-3"
                                    onClick={handleHideGuide}
                                >
                                    {t("home.guide.confirm")}
                                </button>
                            </div>
                        )}
                        <h2 className="text-base font-semibold mb-3 mt-3 mb-5">
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
                        className={`fixed bottom-[30px] right-[30px] text-[2rem] rounded-full w-[60px] h-[60px] ${
                            disableCreateButton
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-green hover:bg-green/90"
                        } text-white`}
                        onClick={handleCreateLink}
                        disabled={disableCreateButton}
                    >
                        +
                    </button>

                    <AppSidebar onItemClick={handleMenuClick} />
                    <Dialog open={openDocumentDialog} onOpenChange={setOpenDocumentDialog}>
                        <DialogContent className="h-[80%] w-[90%]">
                            <DialogDescription>
                                <iframe
                                    src={documentUrl}
                                    title="description"
                                    width="100%"
                                    height="100%"
                                ></iframe>
                            </DialogDescription>
                        </DialogContent>
                    </Dialog>
                    <TransactionToast
                        open={toastData?.open ?? false}
                        onOpenChange={(open) =>
                            setToastData({
                                open: open as boolean,
                                title: "",
                                description: "",
                                variant: null,
                            })
                        }
                        title={toastData?.title ?? ""}
                        description={toastData?.description ?? ""}
                        variant={toastData?.variant ?? "default"}
                    />
                </Sheet>
            </div>
        );
    }
}
