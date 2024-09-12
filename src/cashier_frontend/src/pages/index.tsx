import LinkItem from "@/components/link-item";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ConnectWallet } from "@nfid/identitykit/react"
import { Link } from "react-router-dom";

const mocks = [
    {
        linkName: "Pedro giveaway",
        status: "Active",
        url: "https://avatars.githubusercontent.com/u/29966005?v=4",
        createdAt: "2 days ago"
    },
    {
        linkName: "Donation",
        status: "Active",
        url: "https://avatars.githubusercontent.com/u/2996211?v=4",
        createdAt: "1 week ago"
    },
    {
        linkName: "NFT airdrop",
        status: "Active",
        url: "https://avatars.githubusercontent.com/u/29966005?v=4",
        createdAt: "1 month"
    }
]

export default function HomePage() {
    return (
        <div className="w-screen flex justify-center py-5">
            <div className="w-11/12 max-w-[400px]">
                <div className="w-full flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Cashier</h1>
                    <ConnectWallet />
                </div>
                <div className="my-5">
                    <h1 className="text-base font-bold">Cashier links</h1>
                    <p className="text-sm text-gray-500">Start creating transaction links with Cashier:
                        create & airdrop NFTs, and more features coming!</p>
                </div>
                <div className="w-full flex justify-between items-center">
                    <h2 className="text-base font-semibold">Links created by me</h2>
                    <Link to="/create"><Button>+</Button></Link>
                </div>
                {
                    mocks.map((link, index) => (
                        <LinkItem key={index} link={link} />
                    ))
                }
            </div>
        </div>
    );
}