import { useAuth } from "@nfid/identitykit/react";
import React from "react";
import LoginButton from "./login-button";
import { Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { SheetTrigger } from "./ui/sheet";
import { RiMenu2Line } from "react-icons/ri";
import { useLocation, useNavigate } from "react-router-dom";
import { useResponsive } from "@/hooks/responsive-hook";
import { useConnectToWallet } from "@/hooks/user-hook";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const responsive = useResponsive();
    const { connectToWallet } = useConnectToWallet();

    if (!user) {
        return (
            <div
                className={`w-full flex justify-between items-center ${responsive.isSmallDevice ? "px-4" : "px-8"}`}
            >
                <img
                    src="./logo.svg"
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
    } else {
        return (
            <>
                <div
                    className={`w-full flex justify-between items-center ${responsive.isSmallDevice ? "px-4 pt-4" : "px-8 py-3 mb-4 bg-white"}`}
                >
                    <img
                        src="./logo.svg"
                        alt="Cashier logo"
                        className="max-w-[130px] cursor-pointer"
                        onClick={() => navigate("/")}
                    />
                    {!pathname.includes("/wallet") && (
                        <Button
                            variant="outline"
                            className="ml-auto light-borders mr-3 flex items-center gap-2"
                            onClick={() => navigate("/wallet")}
                        >
                            <p className="text-primary/75 font-normal text-sm">
                                {user.principal.toText().slice(0, 9)}
                            </p>
                            <Wallet size={16} color={"green"} />
                        </Button>
                    )}

                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="light-borders">
                            <RiMenu2Line />
                        </Button>
                    </SheetTrigger>
                </div>
            </>
        );
    }
};

export default Header;
