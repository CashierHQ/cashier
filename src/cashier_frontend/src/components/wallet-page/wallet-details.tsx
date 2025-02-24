import { ArrowDown, ArrowUp, Eye } from "lucide-react";

export function WalletDetails() {
    return (
        <div className="px-4 pt-6 pb-5">
            <h1 className="text-center">Wallet Balance</h1>

            <div className="flex gap-2.5">
                <span className="text-[32px]">$4 321</span> <Eye size={24} />
            </div>

            <div className="flex gap-6">
                <div className="flex flex-col ">
                    <div className="bg-lightgreen rounded-full">
                        <ArrowUp />
                    </div>
                </div>

                <div className="bg-lightgreen rounded-full">
                    <ArrowDown />
                </div>
            </div>
        </div>
    );
}
