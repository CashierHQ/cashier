import { X } from "lucide-react";
import { Logo } from "../ui/logo";

interface WalletHeaderProps {
    onClose?: () => void;
}

export function WalletHeader({ onClose = () => {} }: WalletHeaderProps) {
    return (
        <div className="flex justify-between items-center min-h-20 py-2.5 px-4">
            <Logo />

            <button onClick={onClose}>
                <X size={28} strokeWidth={1.5} />
            </button>
        </div>
    );
}
