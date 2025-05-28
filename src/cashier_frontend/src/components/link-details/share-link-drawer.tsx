import { FC, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { IoIosClose } from "react-icons/io";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { FaDiscord, FaTelegram, FaWhatsapp } from "react-icons/fa6";

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
                        <button className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-black font-bold">𝕏</span>
                            </div>
                            <span className="text-xs mt-1">Twitter</span>
                        </button>
                        <button className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <FaTelegram />
                            </div>
                            <span className="text-xs mt-1">Telegram</span>
                        </button>
                        <button className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <FaDiscord />
                            </div>
                            <span className="text-xs mt-1">Discord</span>
                        </button>
                        <button className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <FaWhatsapp />
                            </div>
                            <span className="text-xs mt-1">Whatsapp</span>
                        </button>
                        {/* <button className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-gray-700">
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"
                                            fill="#616161"
                                        />
                                        <path
                                            d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                                            stroke="#616161"
                                            strokeWidth="2"
                                        />
                                    </svg>
                                </span>
                            </div>
                            <span className="text-xs mt-1">Others</span>
                        </button> */}
                    </div>

                    <Button
                        id="copy-link-button"
                        onClick={onCopyLink}
                        className="w-full rounded-full bg-[#79BFB0] text-white"
                    >
                        Copy Link
                    </Button>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
