// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
