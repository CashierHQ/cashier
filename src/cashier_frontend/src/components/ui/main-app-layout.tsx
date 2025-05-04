import { useAuth } from "@nfid/identitykit/react";
import { useResponsive } from "@/hooks/responsive-hook";
import Header from "@/components/header";
import SheetWrapper from "@/components/sheet-wrapper";
import { ReactNode, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
type MainAppLayoutProps = {
    children: ReactNode;
};

export const MainAppLayout = ({ children }: MainAppLayoutProps) => {
    const responsive = useResponsive();
    const { pathname } = useLocation();
    const { user: walletUser } = useAuth();

    // Prevent body scrolling on iOS
    useEffect(() => {
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.position = "";
            document.body.style.width = "";
            document.body.style.height = "";
            document.body.style.overflow = "";
        };
    }, []);

    const isHeaderHidden = useMemo(() => {
        const hiddenPaths = ["/edit", "/details"];
        const isLargeDevice = !responsive.isSmallDevice;

        return hiddenPaths.some((path) => pathname.includes(path)) && !isLargeDevice;
    }, [pathname, responsive.isSmallDevice]);

    if (!walletUser && pathname === "/") {
        return (
            <div className="fixed inset-0 flex justify-center py-5 overflow-hidden">
                <div className="flex w-full flex-col items-center gap-4">
                    <Header />
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`fixed inset-0 flex justify-center overflow-hidden ${responsive.isSmallDevice ? "" : "bg-lightgreen"}`}
        >
            <SheetWrapper>
                <div className="flex w-full flex-col h-full overflow-hidden">
                    {!isHeaderHidden && <Header />}
                    <div
                        className={`flex items-center justify-center flex-col ${
                            responsive.isSmallDevice
                                ? "px-4 pt-4 h-full overflow-y-auto overscroll-none"
                                : "h-[90%] w-[600px] px-4 items-center bg-[white] shadow-[#D6EDE433] shadow-sm rounded-[16px] mx-auto pt-8 pb-4 overflow-y-auto overscroll-none"
                        }`}
                    >
                        {children}
                    </div>
                </div>
            </SheetWrapper>
        </div>
    );
};
