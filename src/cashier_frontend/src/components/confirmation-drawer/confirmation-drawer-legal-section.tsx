// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FC } from "react";

export const ConfirmationPopupLegalSection: FC = () => {
    return (
        <section id="confirmation-popup-section-legal-text" className="mb-3 ml-2 mt-2">
            <p className="text-[14px] font-normal text-center px-4">
                By confirming, you agree to the{" "}
                <a
                    className="text-[#36a18b]"
                    target="_blank"
                    href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-7212/01084c48b7877f0"
                    rel="noreferrer"
                >
                    Terms of Service
                </a>{" "}
                and{" "}
                <a
                    className="text-[#36a18b]"
                    target="_blank"
                    href="https://doc.clickup.com/9012452868/d/h/8cjy7g4-7232/38befdcfae1af1b"
                    rel="noreferrer"
                >
                    Privacy Policy
                </a>
            </p>
        </section>
    );
};
