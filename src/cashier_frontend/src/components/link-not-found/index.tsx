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
import { FaExclamationTriangle } from "react-icons/fa";

interface LinkNotFoundProps {
    message?: string;
}

const LinkNotFound: React.FC<LinkNotFoundProps> = ({
    message = "The link you're looking for has inactive or is no longer available.",
}) => {
    return (
        <div className="flex flex-col flex-grow w-full h-full items-center justify-center">
            <div className="text-center p-6 bg-gray-100 rounded-lg shadow-md max-w-md">
                <div className="flex justify-center mb-4">
                    <FaExclamationTriangle size={40} className="text-yellow-500" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Link Not Available</h2>
                <p className="text-gray-600">{message}</p>
            </div>
        </div>
    );
};

export default LinkNotFound;
