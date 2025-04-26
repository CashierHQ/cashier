import { ChevronLeft } from "lucide-react";
import { ReactNode } from "react";

export interface BackHeaderProps {
    onBack?: () => void;
    children?: ReactNode;
}

export function BackHeader({ onBack = () => {}, children }: BackHeaderProps) {
    return (
        <div className="relative flex justify-center">
            <button className="absolute top-1/2 -translate-y-1/2 left-0" onClick={onBack}>
                <ChevronLeft size={24} />
            </button>

            {children}
        </div>
    );
}
