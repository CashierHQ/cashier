import { useAuth } from "@nfid/identitykit/react";
import React from "react";
import LoginButton from "./login-button";
import { Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { AiOutlineExperiment } from "react-icons/ai";
import { SheetTrigger } from "./ui/sheet";
import { RiMenu2Line } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
    onConnect: (e: React.MouseEvent<HTMLButtonElement>) => void;
    openTestForm: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const Header: React.FC<HeaderProps> = ({ onConnect, openTestForm }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        return (
            <div className="w-full flex justify-between items-center">
                <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                <LoginButton onClick={onConnect}>Login</LoginButton>
            </div>
        );
    } else {
        return (
            <>
                <div className="w-full flex justify-between items-center">
                    <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                    <Button
                        variant="outline"
                        size="icon"
                        className="ml-auto rounded-sm mr-3"
                        onClick={() => navigate("/wallet")}
                    >
                        <Wallet size={16} />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-sm mr-3"
                        onClick={(e) => openTestForm(e)}
                    >
                        <AiOutlineExperiment />
                    </Button>

                    {/* <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-sm">
                            <RiMenu2Line />
                        </Button>
                    </SheetTrigger> */}
                </div>
            </>
        );
    }
};

export default Header;
