import { X } from "lucide-react";
import { Logo } from "../ui/logo";

export function WalletHeader() {
    return (
        <div className="flex justify-between items-center h-20 py-2.5 px-4">
            <Logo />

            <button onClick={() => console.log("clicked close wallet")}>
                <X size={40} />
            </button>
        </div>
    );
}
