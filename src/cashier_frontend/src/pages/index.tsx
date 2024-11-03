import { ConnectWalletButton, useIdentityKit } from "@nfid/identitykit/react";
import { ConnectWallet } from "@nfid/identitykit/react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LinkItem from "@/components/link-item";
import { Skeleton } from "@/components/ui/skeleton";
import { IoSearch } from "react-icons/io5";
import LinkService from "@/services/link.service";
import { Button } from "@/components/ui/button";
import { sampleLink1, sampleLink2 } from "@/constants/sampleLinks";
import { LinkDetailModel, State } from "@/services/types/link.service.types";
import { formatDateString } from "@/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { UpdateLinkParams, useUpdateLink } from "@/hooks/linkHooks";
import UserService from "@/services/user.service";

export default function HomePage() {
    const { t } = useTranslation();
    const { user: connectedUser, identity } = useIdentityKit();
    const [user, setUser] = useState<any>(connectedUser);
    const { data: appUser, isLoading: isUserLoading } = useQuery({
        ...queryKeys.users.detail(identity),
        enabled: !!identity,
    });
    const { data: linkData, isLoading: isLinksLoading } = useQuery({
        ...queryKeys.links.list(identity),
        enabled: !!connectedUser,
    });
    const queryClient = useQueryClient();
    const { mutateAsync } = useUpdateLink(queryClient, identity);

    const [showGuide, setShowGuide] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const { connect } = useIdentityKit();

    useEffect(() => {
        if (isUserLoading || isLinksLoading) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
        }
    }, [isUserLoading, isLinksLoading]);
    const createSingleLink = async (linkInput: LinkDetailModel, linkService: LinkService) => {
        // First create link ID
        let initLinkId: string = await linkService.createLink({
            link_type: { NftCreateAndAirdrop: null },
        });
        if (initLinkId) {
            const updatedLinkParam: UpdateLinkParams = {
                linkId: initLinkId,
                linkModel: linkInput,
            };
            await mutateAsync(updatedLinkParam);
            linkInput = {
                ...linkInput,
                state: State.Active,
            };
            const updatedLinkParamActive: UpdateLinkParams = {
                linkId: initLinkId,
                linkModel: linkInput,
            };
            await mutateAsync(updatedLinkParamActive);
        }
    };

    const createSampleLink = async (linkService: LinkService) => {
        try {
            await createSingleLink(sampleLink1, linkService);
            await createSingleLink(sampleLink2, linkService);
        } catch (err) {
            console.log(err);
        }
    };

    const connectToWallet = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        connect();
    };

    useEffect(() => {
        if (localStorage.getItem("showGuide") === "false") {
            setShowGuide(false);
        } else {
            setShowGuide(true);
        }
    }, []);

    useEffect(() => {
        console.log("🚀 ~ useEffect ~ connectedUser:", connectedUser);
        if (connectedUser) {
            setUser(connectedUser);
        }
    }, [connectedUser]);

    useEffect(() => {
        const initSampleLinks = async () => {
            try {
                setIsLoading(true);
                const linkService = new LinkService(identity);
                await createSampleLink(linkService);
            } catch (err) {
                console.log(err);
            } finally {
                setIsLoading(false);
            }
        };

        if (linkData && Object.keys(linkData).length === 0) {
            initSampleLinks();
        }
    }, [linkData]);

    useEffect(() => {
        const createUser = async () => {
            const userService = new UserService(identity);
            try {
                const user = await userService.createUser();
                setUser(user);
            } catch (error) {
                console.log(error);
            }
        };
        if (identity && !appUser) {
            createUser();
        }
    }, [identity, appUser]);

    const handleCreateLink = async () => {
        const response = await new LinkService(identity).createLink({
            link_type: { NftCreateAndAirdrop: null },
        });
        navigate(`/edit/${response}`);
    };

    const handleHideGuide = () => {
        setShowGuide(false);
        localStorage.setItem("showGuide", "false");
    };

    const renderLinkList = (links: Record<string, LinkDetailModel[]> | undefined) => {
        if (links && Object.keys(links).length > 0) {
            return (
                <div>
                    {Object.entries(links).map(([date, items]) => (
                        <div key={date} className="mb-3">
                            <h3 className="text-lightblack">{formatDateString(date)}</h3>
                            <ul>
                                {items.map((item) => (
                                    <Link
                                        to={
                                            item.state === "Active"
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
                <div className="w-full flex flex-col items-center mt-[100px]">
                    <IoSearch
                        style={{
                            borderRadius: "5px",
                            border: "solid gray 1px",
                            padding: "8px",
                        }}
                        size="40px"
                    />
                    <span className="font-semibold mt-5">{t("home.noLinksFound")}</span>
                    <p className="text-gray-500">{t("home.noLinksFoundDescription")}</p>
                </div>
            );
        }
    };

    if (!connectedUser) {
        return (
            <div className="w-screen flex justify-center py-5">
                <div className="w-11/12 max-w-[400px] flex flex-col items-center">
                    <div className="w-full flex justify-between items-center">
                        <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                        <ConnectWalletButton onClick={connectToWallet}>
                            Get started
                        </ConnectWalletButton>
                    </div>

                    <div className="w-11/12 max-w-[400px] flex flex-col items-center mt-8">
                        <span className="font-semibold mt-5 text-3xl text-center">
                            Cashier Links - <br />
                            fast, easy, and safe{" "}
                        </span>
                        <p className="text-gray-500 text-center mt-3">
                            Start creating transaction links with Cashier: create & airdrop NFTs,
                            and more features coming!
                        </p>
                        <img
                            src="./landingPage.png"
                            alt="Cashier illustration"
                            className="max-w-[300px] mt-5"
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
            <div className="w-screen flex justify-center py-3">
                <div className="w-11/12 max-w-[400px]">
                    <div className="w-full flex justify-between items-center">
                        <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                        <ConnectWallet />
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
                    <h2 className="text-base font-semibold mb-3 mt-3 mb-5">Links created by me</h2>
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
                    className="fixed bottom-[30px] right-[30px] text-[2rem] rounded-full w-[60px] h-[60px] bg-green text-white hover:bg-green/90"
                    onClick={handleCreateLink}
                >
                    +
                </button>
            </div>
        );
    }
}
