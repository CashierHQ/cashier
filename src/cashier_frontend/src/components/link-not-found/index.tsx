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

import React from "react";
import { useNavigate } from "react-router-dom";
import { FaExclamationTriangle } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import SheetWrapper from "@/components/sheet-wrapper";

interface LinkNotFoundProps {
    message?: string;
}

const LinkNotFound: React.FC<LinkNotFoundProps> = ({
    message = "The link you're looking for is inactive or no longer available.",
}) => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate("/");
    };

    return (
        <MainAppLayout>
            <SheetWrapper>
                <div className="flex flex-col flex-grow w-full h-full items-center justify-center px-6 py-8">
                    <div className="text-center max-w-md space-y-6">
                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <Logo />
                        </div>

                        {/* Warning Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-yellow-100 rounded-full">
                                <FaExclamationTriangle size={32} className="text-yellow-600" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                            Link Not Available
                        </h1>

                        {/* Message */}
                        <p className="text-gray-600 text-center leading-relaxed mb-8">{message}</p>

                        {/* Home Button */}
                        <Button onClick={handleGoHome} className="w-full max-w-xs mx-auto">
                            Go to Home
                        </Button>
                    </div>
                </div>
            </SheetWrapper>
        </MainAppLayout>
    );
};

export default LinkNotFound;
