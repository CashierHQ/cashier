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

import { useDeviceSize } from "@/hooks/responsive-hook";
import { Link } from "lucide-react";
import { FaFacebook, FaXTwitter, FaTelegram, FaLinkedin } from "react-icons/fa6";

export default function SocialButtons({
    handleCopyLink,
}: {
    handleCopyLink: (e: React.SyntheticEvent) => void;
}) {
    const responsive = useDeviceSize();
    const url = window.location.href.replace("details/", "");

    const shareToFacebook = () => {
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            "_blank",
        );
    };

    const shareToTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, "_blank");
    };

    const shareToTelegram = () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, "_blank");
    };

    const shareToLinkedIn = () => {
        window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            "_blank",
        );
    };

    return (
        <div className="flex flex-col w-full">
            <div
                className={`flex items-center gap-4 justify-between ${responsive.isSmallDevice ? " mb-4" : ""}`}
            >
                <SocialButton icon={<Link size={18} />} title="Copy Link" action={handleCopyLink} />
                <SocialButton
                    icon={<FaFacebook size={18} />}
                    title="Facebook"
                    action={shareToFacebook}
                />
                <SocialButton
                    icon={<FaXTwitter size={18} />}
                    title="Twitter"
                    action={shareToTwitter}
                />
                <SocialButton
                    icon={<FaTelegram size={18} />}
                    title="Telegram"
                    action={shareToTelegram}
                />
                <SocialButton
                    icon={<FaLinkedin size={18} />}
                    title="LinkedIn"
                    action={shareToLinkedIn}
                />
            </div>
        </div>
    );
}

function SocialButton({
    icon,
    title,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    action?: (e: React.SyntheticEvent) => void;
}) {
    const handleClick = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (action) {
            action(e);
        }
    };
    return (
        <button onClick={handleClick} className="flex flex-col items-center gap-2.5">
            <div className="flex items-center justify-center w-10 h-10 bg-lightgreen rounded-full">
                {icon}
            </div>
            <span className="text-xs font-light leading-none text-grey">{title}</span>
        </button>
    );
}
