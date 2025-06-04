// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { X } from "lucide-react";
import { Logo } from "../ui/logo";
import { useDeviceSize } from "@/hooks/responsive-hook";

interface WalletHeaderProps {
    onClose?: () => void;
}

export function WalletHeader({ onClose = () => {} }: WalletHeaderProps) {
    const responsive = useDeviceSize();

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
