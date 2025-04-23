import { useAuth } from "@nfid/identitykit/react";
import { useResponsive } from "@/hooks/responsive-hook";
import Header from "@/components/header";
import SheetWrapper from "@/components/sheet-wrapper";
import { ReactNode, useMemo } from "react";
import { useLocation } from "react-router-dom";
type MainAppLayoutProps = {
    children: ReactNode;
};

export const MainAppLayout = ({ children }: MainAppLayoutProps) => {
    const responsive = useResponsive();
    const { pathname } = useLocation();
    const { user: walletUser } = useAuth();

    const isHeaderHidden = useMemo(() => {
        const hiddenPaths = ["/edit", "/details"];
        const isLargeDevice = !responsive.isSmallDevice;

        return hiddenPaths.some((path) => pathname.includes(path)) && !isLargeDevice;
    }, [pathname, responsive.isSmallDevice]);

    if (!walletUser || pathname === "/") {
        return (
            <div className="w-screen flex justify-center py-5 h-full">
                <div className="flex w-full flex-col items-center gap-4">
                    <Header />
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`w-screen flex justify-center pb-5 overflow-y-hidden h-dvh ${responsive.isSmallDevice ? "" : "bg-lightgreen"}`}
        >
            <SheetWrapper>
                <div className="flex w-full flex-col h-full">
                    {!isHeaderHidden && <Header />}
                    <div
                        className={`flex items-center justify-center h-full flex-col ${responsive.isSmallDevice ? "px-4 pt-4 h-full" : "max-h-[90%] w-[600px] px-4 items-center bg-[white] shadow-[#D6EDE433] shadow-sm rounded-[16px] mx-auto overflow-y-hidden pt-8 pb-4"}`}
                    >
                        {children}
                    </div>
                </div>
            </SheetWrapper>
        </div>
    );
};
