import { X } from "lucide-react";
import { Logo } from "../ui/logo";

export function WalletHeader() {
    const handleCloseClick = () => {
        console.log("clicked close wallet");
    };

    return (
        <div className="flex justify-between items-center min-h-20 py-2.5 px-4">
            <Logo />

            <button onClick={handleCloseClick}>
                <X size={40} />
            </button>
        </div>
    );
}
