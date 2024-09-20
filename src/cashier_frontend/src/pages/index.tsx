import { Button } from "@/components/ui/button";
import { createActor } from "../../../declarations/cashier_backend";
import { useIdentityKit } from "@nfid/identitykit/react";
import { ConnectWallet } from "@nfid/identitykit/react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { HttpAgent } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { parseResultResponse } from "@/utils";

export default function HomePage() {
    const { agent, identity } = useIdentityKit();
    const [links, setLinks] = useState<any>([]);
    const [user, setUser] = useState<any>(null);

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

    const handleCreateLink = async () => {
        const link = parseResultResponse(
            await actor.create_link({
                link_type: { NftCreateAndAirdrop: null },
            }),
        );
        console.log("Link created", link);
    };

    return (
        <div className="w-screen flex justify-center py-5">
            <div className="w-11/12 max-w-[400px]">
                <div className="w-full flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Cashier</h1>
                    <ConnectWallet />
                </div>
                <div className="my-5">
                    <h1 className="text-base font-bold">Cashier links</h1>
                    <p className="text-sm text-gray-500">
                        Start creating transaction links with Cashier: create & airdrop NFTs, and
                        more features coming!
                    </p>
                </div>
                <div className="w-full flex justify-between items-center">
                    <h2 className="text-base font-semibold">Links created by me</h2>
                    <Link to="/create">
                        <Button onClick={handleCreateLink}>+</Button>
                    </Link>
                </div>
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
        </div>
    );
}
