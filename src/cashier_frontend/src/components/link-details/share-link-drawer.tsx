import { FC } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { IoIosClose } from "react-icons/io";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { FaDiscord, FaTelegram, FaWhatsapp } from "react-icons/fa6";
import copy from "copy-to-clipboard";

interface ShareLinkDrawerProps {
    open: boolean;
    onClose: () => void;
    onCopyLink: (e: React.SyntheticEvent) => void;
    linkUrl: string;
}

export const ShareLinkDrawer: FC<ShareLinkDrawerProps> = ({
    open,
    onClose,
    onCopyLink,
    linkUrl,
}) => {
    const handleShare = (platform: string) => {
        const encodedUrl = encodeURIComponent(linkUrl);

        switch (platform) {
            case "twitter":
                window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}`, "_blank");
                break;
            case "telegram":
                window.open(
                    `https://t.me/share/url?url=${encodedUrl}&text=Check out this link!`,
                    "_blank",
                );
                break;
            case "discord":
                // Discord doesn't have a direct share URL, so we'll copy to clipboard
                copy(linkUrl);
                break;
            case "whatsapp":
                window.open(`https://api.whatsapp.com/send?text=${encodedUrl}`, "_blank");
                break;
            default:
                break;
        }
    };
    return (
        <Drawer open={open}>
            <DrawerContent className="max-w-[400px] mx-auto p-1 rounded-t-[1.5rem]">
                <DrawerHeader>
                    <DrawerTitle className="relative flex items-center justify-center">
                        <div className="text-lg">Share your link</div>
                        <IoIosClose
                            onClick={onClose}
                            className="absolute right-0 cursor-pointer"
                            size={42}
                        />
                    </DrawerTitle>
                </DrawerHeader>

                <div className="flex flex-col px-4 pb-8">
                    <div className="flex justify-center mb-2">
                        <QRCode size={100} value={linkUrl} />
                    </div>

                    <div className="flex justify-center gap-6 mb-5">
                        <button
                            className="flex flex-col items-center"
                            onClick={() => handleShare("twitter")}
                            aria-label="Share on Twitter"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-black font-bold">𝕏</span>
                            </div>
                            <span className="text-xs mt-1">Twitter</span>
                        </button>
                        <button
                            className="flex flex-col items-center"
                            onClick={() => handleShare("telegram")}
                            aria-label="Share on Telegram"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <FaTelegram />
                            </div>
                            <span className="text-xs mt-1">Telegram</span>
                        </button>
                        <button
                            className="flex flex-col items-center"
                            onClick={() => handleShare("discord")}
                            aria-label="Share on Discord"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <FaDiscord />
                            </div>
                            <span className="text-xs mt-1">Discord</span>
                        </button>
                        <button
                            className="flex flex-col items-center"
                            onClick={() => handleShare("whatsapp")}
                            aria-label="Share on WhatsApp"
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <FaWhatsapp />
                            </div>
                            <span className="text-xs mt-1">Whatsapp</span>
                        </button>
                    </div>

                    <Button
                        id="copy-link-button"
                        onClick={onCopyLink}
                        className="w-full rounded-full bg-green text-white hover:bg-green/90 h-[44px]"
                    >
                        Copy Link
                    </Button>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
