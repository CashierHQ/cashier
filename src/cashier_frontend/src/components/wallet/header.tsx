import { X } from "lucide-react";
import { Logo } from "../ui/logo";
import { useResponsive } from "@/hooks/responsive-hook";

interface WalletHeaderProps {
    onClose?: () => void;
}

export function WalletHeader({ onClose = () => {} }: WalletHeaderProps) {
    const responsive = useResponsive();

    return (
        <div className="flex justify-between items-center h-20 py-2.5 px-4">
            <Logo />

            {/* This only shows on small devices. On larger devices, a back arrow is shown */}
            {responsive.isSmallDevice && (
                <button onClick={onClose}>
                    <X size={28} strokeWidth={1.5} />
                </button>
            )}
        </div>
    );
}
