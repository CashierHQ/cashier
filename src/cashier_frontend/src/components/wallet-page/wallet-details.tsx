import { ArrowDown, ArrowUp, Eye } from "lucide-react";

export function WalletDetails() {
    return (
        <div className="flex flex-col items-center px-4 pt-6 pb-5">
            <h1 className="text-center text-lg font-semibold leading-none">Wallet Balance</h1>

            <div className="flex items-center gap-2.5 mt-2.5">
                <span className="text-[32px]">$4 321</span>
                <Eye size={24} color="#8d8d8d" />
            </div>

            <div className="flex gap-6 mt-4">
                <div className="flex flex-col items-center w-14">
                    <div className="bg-lightgreen rounded-full p-2.5">
                        <ArrowUp size={18} />
                    </div>

                    <span className="text-xs mt-1">Send</span>
                </div>

                <div className="flex flex-col items-center w-14">
                    <div className="bg-lightgreen rounded-full p-2.5">
                        <ArrowDown size={18} />
                    </div>

                    <span className="text-xs mt-1">Receive</span>
                </div>
            </div>
        </div>
    );
}
