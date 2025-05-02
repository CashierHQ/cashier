import { useAuth } from "@nfid/identitykit/react";
import React from "react";
import LoginButton from "./login-button";
import { ChevronLeft, Wallet, X } from "lucide-react";
import { Button } from "./ui/button";
import { SheetTrigger } from "./ui/sheet";
import { RiMenu2Line } from "react-icons/ri";
import { useLocation, useNavigate } from "react-router-dom";
import { useResponsive } from "@/hooks/responsive-hook";
import { useConnectToWallet } from "@/hooks/user-hook";
import { IoExit } from "react-icons/io5";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const responsive = useResponsive();
    const { connectToWallet } = useConnectToWallet();

    const handleNavigate = (path: string) => {
        const backToHomePaths = ["/wallet"];
        if (backToHomePaths.includes(path)) {
            navigate("/");
        } else {
            navigate(-1);
        }
    };

    if (!user) {
        return (
            <div
                className={`w-full flex justify-between items-center ${responsive.isSmallDevice ? "px-4 pt-4" : `px-8 py-3 mb-4 ${location.pathname === "/" ? "" : "bg-white"}`}`}
            >
                <img
                    src={
                        responsive.showCompactHeader(location.pathname)
                            ? "./cLogo.svg"
                            : "./logo.svg"
                    }
                    alt="Cashier logo"
                    className="max-w-[130px]"
                    onClick={() => navigate("/")}
                />
                <LoginButton
                    onClick={() => {
                        connectToWallet();
                    }}
                >
                    Login
                </LoginButton>
            </div>
        );
    } else if (
        !responsive.hideHeader(location.pathname) ||
        (responsive.hideHeader(location.pathname) && !responsive.isSmallDevice)
    ) {
        return (
            <>
                <div
                    className={`w-full flex justify-between items-center ${responsive.isSmallDevice ? "px-4 pt-4" : "px-8 py-3 mb-4 bg-white"}`}
                >
                    {responsive.showHeaderWithBackButtonAndWalletButton(
                        location.pathname,
                        location.search,
                    ) ? (
                        <ChevronLeft
                            size={24}
                            className="cursor-pointer"
                            onClick={() => navigate(-1)}
                        />
                    ) : (
                        <img
                            src="./logo.svg"
                            alt="Cashier logo"
                            className="max-w-[130px] cursor-pointer"
                            onClick={() => navigate("/")}
                        />
                    )}

                    {!location.pathname.includes("/wallet") && (
                        <Button
                            variant="outline"
                            className="ml-auto light-borders p-0 w-9 h-9 mr-3 gap-2"
                            onClick={() => navigate("/wallet")}
                        >
                            {/* <p className="text-primary/75 font-normal text-sm">
                                {user.principal.toText().slice(0, 9)}
                            </p> */}
                            <Wallet size={16} color={"#35A18A"} />
                        </Button>
                    )}

                    {responsive.hideHeader(location.pathname) && !responsive.isSmallDevice ? (
                        <></> // Don't show X button on big device header when hideHeader is true
                    ) : responsive.showCompactHeader(location.pathname) ? (
                        <X
                            size={24}
                            className="cursor-pointer"
                            onClick={() => handleNavigate(location.pathname)}
                        />
                    ) : (
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="light-borders">
                                <RiMenu2Line />
                            </Button>
                        </SheetTrigger>
                    )}
                </div>
            </>
        );
    }
};

export default Header;
