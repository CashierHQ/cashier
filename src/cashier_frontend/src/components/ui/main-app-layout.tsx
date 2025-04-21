import { useAuth } from "@nfid/identitykit/react";
import { useResponsive } from "@/hooks/responsive-hook";
import Header from "@/components/header";
import SheetWrapper from "@/components/sheet-wrapper";
import { ReactNode } from "react";

type MainAppLayoutProps = {
    children: ReactNode;
};

export const MainAppLayout = ({ children }: MainAppLayoutProps) => {
    const responsive = useResponsive();
    const { user: walletUser } = useAuth();

    if (!walletUser) {
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
            className={`w-screen flex justify-center py-5 h-screen ${responsive.isSmallDevice ? "" : "bg-lightgreen"}`}
        >
            <SheetWrapper>
                <div className="flex w-full flex-col h-full">
                    <Header />
                    <div
                        className={`flex h-full flex-col ${responsive.isSmallDevice ? "px-2 pt-9 h-full" : "max-h-[90%] w-[600px] p-2 items-center bg-[white] rounded-md drop-shadow-md mx-auto overflow-y-hidden"}`}
                    >
                        {children}
                    </div>
                </div>
            </SheetWrapper>
        </div>
    );
};
