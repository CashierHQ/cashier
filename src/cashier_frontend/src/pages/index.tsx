import { Button } from "@/components/ui/button";
import { createActor } from "../../../declarations/cashier_backend";
import { useIdentityKit } from "@nfid/identitykit/react";
import { ConnectWallet } from "@nfid/identitykit/react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { HttpAgent } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { parseResultResponse } from "@/utils";
import { useTranslation } from "react-i18next";

export default function HomePage() {
    const { t } = useTranslation();
    const { agent, identity } = useIdentityKit();
    const [links, setLinks] = useState<any>([]);
    const [user, setUser] = useState<any>(null);
    const [showGuide, setShowGuide] = useState(true);

    const actor = createActor(BACKEND_CANISTER_ID, {
        agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
    });

    useEffect(() => {
        if (!agent) return;
        const createUser = async () => {
            const user = await actor.get_user();
            if ("Ok" in user) setUser(user);
            else {
                const user = parseResultResponse(await actor.create_user());
                setUser(user);
            }
        };
        createUser();
    }, [agent]);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            const links = parseResultResponse(
                await actor.get_links([
                    {
                        offset: BigInt(0),
                        limit: BigInt(10),
                    },
                ]),
            );
            console.log(links.data);
            setLinks(links.data);
        };
        fetchData();
    }, [user]);

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
                            onClick={() => setShowGuide(false)}
                        >
                            {t("home.guide.confirm")}
                        </button>
                    </div>
                )}
                <h2 className="text-base font-semibold mt-5">Links created by me</h2>
                {links.map((link: any) => (
                    <div
                        key={link.id}
                        className="w-full my-3 p-3 border border-gray-200 rounded-md"
                    >
                        <h3 className="text-base font-semibold">Link id: {link.id}</h3>
                        <p className="text-sm text-gray-500">{"No title"}</p>
                    </div>
                ))}
            </div>
            <Link to="/new" state={{ isValidEntry: true }}>
                <button className="fixed bottom-[30px] right-[30px] rounded-full w-[50px] h-[50px] bg-green text-white">
                    +
                </button>
            </Link>
        </div>
    );
}
