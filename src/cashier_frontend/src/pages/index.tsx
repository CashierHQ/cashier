import { useIdentityKit } from "@nfid/identitykit/react";
import { ConnectWallet } from "@nfid/identitykit/react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LinkItem from "@/components/link-item";
import { Skeleton } from "@/components/ui/skeleton";
import { IoSearch } from "react-icons/io5";
import LinkService from "@/services/link.service";
import UserService from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { sampleLink1, sampleLink2 } from "@/constants/sampleLinks";
import { LinkDetail } from "../../../declarations/cashier_backend/cashier_backend.did";
import { State, UpdateLinkInput } from "@/services/types/link.service.types";

export default function HomePage() {
    const { t } = useTranslation();
    const { agent, identity } = useIdentityKit();
    const [links, setLinks] = useState<any>([]);
    const [user, setUser] = useState<any>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const createSingleLink = async (linkInput: any, linkService: LinkService) => {
        // First create link ID
        let initLink: string = await linkService.createLink({
            link_type: { NftCreateAndAirdrop: null },
        });
        if (initLink) {
            await linkService.updateLink(initLink, linkInput);
            linkInput = {
                ...linkInput,
                state: State.Active,
            };
            await linkService.updateLink(initLink, linkInput);
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

    useEffect(() => {
        if (localStorage.getItem("showGuide") === "false") {
            setShowGuide(false);
        } else {
            setShowGuide(true);
        }
    }, []);

    useEffect(() => {
        if (!identity) return;
        const createUser = async () => {
            const userService = new UserService(identity);
            try {
                const user = await userService.getUser();
                setUser(user);
            } catch (error) {
                const user = await userService.createUser();
                setUser(user);
            }
        };
        createUser();
    }, [identity]);

    useEffect(() => {
        if (!user) {
            return;
        }
        const fetchData = async () => {
            const linkService = new LinkService(identity);
            const links = await linkService.getLinks();
            if (links?.data.length == 0) {
                // User login first time, then create 2 sample links
                await createSampleLink(linkService);
                const newLinkList = await linkService.getLinks();
                console.log("🚀 ~ fetchData ~ newLinkList:", newLinkList);
                setLinks(newLinkList.data ?? []);
                setIsLoading(false);
            } else {
                console.log("🚀 ~ fetchData ~ newLinkList:", links);
                setIsLoading(false);
                setLinks(links.data ?? []);
            }
        };
        fetchData();
    }, [user]);

    const handleCreateLink = async () => {
        if (!user) return;
        const response = await new LinkService(identity).createLink({
            link_type: { NftCreateAndAirdrop: null },
        });
        navigate(`/edit/${response}`);
    };

    const handleHideGuide = () => {
        setShowGuide(false);
        localStorage.setItem("showGuide", "false");
    };

    if (!agent) {
        return (
            <div className="w-screen flex justify-center py-5">
                <div className="w-11/12 max-w-[400px] flex flex-col items-center">
                    <div className="w-full flex justify-between items-center">
                        <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                        <ConnectWallet />
                    </div>

                    <div className="w-11/12 max-w-[400px] flex flex-col items-center mt-[100px]">
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
                    type="submit"
                    className="fixed bottom-[30px] w-[80vw] max-w-[350px] rounded-full left-1/2 -translate-x-1/2"
                >
                    Get started
                </Button>
            </div>
        );
    }

    return (
        <div className="w-screen flex justify-center py-5">
            <div className="w-11/12 max-w-[400px]">
                <div className="w-full flex justify-between items-center">
                    <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                    <ConnectWallet />
                </div>
                {showGuide && (
                    <div className="my-8">
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
                <h2 className="text-base font-semibold mb-5 mt-8">Links created by me</h2>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                        <div className="flex items-center space-x-4 my-3" key={index}>
                            <Skeleton className="h-10 w-10 rounded-sm" />
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-[75vw] max-w-[320px]" />
                                <Skeleton className="h-3 w-[200px]" />
                            </div>
                        </div>
                    ))
                ) : links.length === 0 ? (
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
                ) : (
                    links.map((link: any) => (
                        <Link
                            to={
                                link.state === "Active" ? `/details/${link.id}` : `/edit/${link.id}`
                            }
                            key={link.id}
                        >
                            <LinkItem key={link.id} link={link} />
                        </Link>
                    ))
                )}
            </div>
            <button
                className="fixed bottom-[30px] right-[30px] rounded-full w-[50px] h-[50px] bg-green text-white hover:bg-green/90"
                onClick={handleCreateLink}
            >
                +
            </button>
        </div>
    );
}
