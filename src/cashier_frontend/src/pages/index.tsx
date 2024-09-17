import { Button } from "@/components/ui/button";
import { createActor } from "../../../declarations/cashier_backend";
import { useIdentityKit } from "@nfid/identitykit/react";
import { ConnectWallet } from "@nfid/identitykit/react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { HttpAgent } from "@dfinity/agent";

export default function HomePage() {
    const { agent, identity } = useIdentityKit();
    const [links, setLinks] = useState<any>([]);
    const [user, setUser] = useState<any>(null);

    const actor = createActor("txyno-ch777-77776-aaaaq-cai", {
        agent: HttpAgent.createSync({ identity }),
    });

    useEffect(() => {
        const createUser = async () => {
            const user = await actor.get_user();
            if ("Ok" in user) setUser(user);
            else {
                const create = await actor.create_user();
                if ("Ok" in create) setUser(create.Ok);
            }
        };
        createUser();
    }, [agent]);

    // useEffect(() => {
    //     const fetchData = async () => {
    //         const links = await actor.get_links([{
    //             offset: BigInt(0),
    //             limit: BigInt(10)
    //         }]);
    //         console.log("links", links);
    //         if ('Ok' in links) setLinks(links!.Ok.data);
    //     }
    //     fetchData();
    // }, [user]);

    // console.log(agent);
    console.log("user", user);

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
                        <Button>+</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
