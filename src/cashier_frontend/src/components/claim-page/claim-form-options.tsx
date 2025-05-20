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

import React, { useEffect, useState } from "react";
import { IoWalletOutline } from "react-icons/io5";
import { PiWallet } from "react-icons/pi";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from "@/pages/[id]";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { IconInput } from "../icon-input";
import WalletButton from "./connect-wallet-button";
import { useAuth, useIdentity, useSigner } from "@nfid/identitykit/react";
import CustomConnectedWalletButton from "./connected-wallet-button";
import ConfirmDialog from "../confirm-dialog";
import { useConfirmDialog } from "@/hooks/useDialog";
import { Principal } from "@dfinity/principal";
import { FaCheck } from "react-icons/fa6";
import { ErrorMessageWithIcon } from "@/components/ui/error-message-with-icon";
import { useSignerStore } from "@/stores/signerStore";
import { useConnectToWallet } from "@/hooks/user-hook";
import { useParams } from "react-router-dom";
import { ACTION_TYPE } from "@/services/types/enum";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { useTokens } from "@/hooks/useTokens";
import { ClipboardIcon } from "lucide-react";
import TokenItem from "./token-item";
import { IoMdClose } from "react-icons/io";
import WalletConnectDialog from "@/components/wallet-connect-dialog";
import { InternetIdentity, NFIDW, Stoic } from "@nfid/identitykit";
import {
    WALLET_OPTIONS,
    walletDialogConfigOptions,
    getWalletIcon,
    GoogleSigner,
} from "@/constants/wallet-options";
import { LuWallet2 } from "react-icons/lu";

interface ClaimFormOptionsProps {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    formData?: LinkDetailModel;
    setDisabled: (disabled: boolean) => void;
}

const ClaimFormOptions: React.FC<ClaimFormOptionsProps> = ({ form, setDisabled }) => {
    const { t } = useTranslation();
    const { user, disconnect } = useAuth();
    const identity = useIdentity();
    const { open, options, hideDialog, showDialog } = useConfirmDialog();
    const signer = useSigner();
    const { connectToWallet } = useConnectToWallet();
    const { setCurrentConnectOption } = useSignerStore();
    const { linkId } = useParams();
    const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

    const { link } = useLinkAction(linkId, ACTION_TYPE.USE_LINK);
    const { updateTokenInit } = useTokens();

    const isGoogleLogin = signer?.id === "GoogleSigner";

    const isAddressValid = () => {
        const address = form.getValues("address");

        if (!address) return false;

        try {
            Principal.fromText(address);
            return true;
        } catch {
            return false;
        }
    };

    useEffect(() => {
        updateTokenInit();
    }, []);

    useEffect(() => {
        // If user is authenticated, enable the form
        if (identity) {
            console.log("User is authenticated");
            setDisabled(false);
            return;
        }

        console.log("User is not authenticated");

        // Otherwise, check if the address is valid
        const isValid = isAddressValid();
        setDisabled(!isValid);
    }, [identity]);

    const checkForExistingWallet = (): boolean => {
        const hasAddress = (form.getValues("address") ?? "").trim().length > 0;
        if (hasAddress || identity) {
            showDialog({
                title: "Are you sure?",
                description:
                    "You are connected to another wallet. Would you like to disconnect and continue?",
            });
            return true;
        }
        return false;
    };

    const handleConnectWallet = (walletOption: WALLET_OPTIONS) => {
        if (checkForExistingWallet()) {
            return;
        }

        setCurrentConnectOption(walletOption);

        switch (walletOption) {
            case WALLET_OPTIONS.INTERNET_IDENTITY:
                if (!identity) {
                    connectToWallet(InternetIdentity.id);
                }
                break;
            case WALLET_OPTIONS.OTHER:
                if (!identity) {
                    setIsWalletDialogOpen(true);
                }
                break;
            case WALLET_OPTIONS.GOOGLE:
                if (!identity) {
                    connectToWallet(GoogleSigner.id);
                }
                break;
        }
    };

    const handlePasteClick = async (field: { onChange: (value: string) => void }) => {
        try {
            const text = await navigator.clipboard.readText();
            field.onChange(text);
            validateAddress(text);
        } catch (err) {
            console.error("Failed to read clipboard contents: ", err);
        }
    };

    const validateAddress = (addressValue: string) => {
        try {
            if (addressValue) {
                Principal.fromText(addressValue);
                form.clearErrors("address");
            } else {
                form.clearErrors("address");
            }
        } catch {
            form.setError("address", {
                type: "manual",
                message: "wallet-format-error",
            });
        }
    };

    const handleWalletSelection = (walletId: string) => {
        setIsWalletDialogOpen(false);

        if (walletId === "stoic") {
            connectToWallet(Stoic.id);
        } else if (walletId === "nfid") {
            connectToWallet(NFIDW.id);
        } else if (walletId === "internet-identity") {
            connectToWallet(InternetIdentity.id);
        }
    };

    // Use wallet dialog options from centralized file
    const dialogOptions = walletDialogConfigOptions.map((option) => ({
        ...option,
        onClick: () => handleWalletSelection(option.id),
    }));

    const renderWalletButton = (
        walletOption: WALLET_OPTIONS,
        title: string,
        iconOrImage?: string | JSX.Element,
        disabled?: boolean,
    ) => {
        // Get the icon from centralized function if not provided
        const finalIconOrImage = iconOrImage || getWalletIcon(walletOption);

        const isConnected =
            identity &&
            ((walletOption === WALLET_OPTIONS.GOOGLE && isGoogleLogin) ||
                (walletOption === WALLET_OPTIONS.INTERNET_IDENTITY &&
                    signer?.id === "InternetIdentity") ||
                (walletOption === WALLET_OPTIONS.OTHER &&
                    signer?.id !== "InternetIdentity" &&
                    !isGoogleLogin));

        if (isConnected) {
            return (
                <CustomConnectedWalletButton
                    connectedAccount={user?.principal.toString()}
                    postfixText="Connected"
                    postfixIcon={
                        typeof finalIconOrImage === "string" ? (
                            <img src={finalIconOrImage} alt={title} className="w-6 h-6 mr-2" />
                        ) : null
                    }
                    handleConnect={() => handleConnectWallet(walletOption)}
                    disabled={disabled}
                />
            );
        }

        return (
            <WalletButton
                title={title}
                handleConnect={() => handleConnectWallet(walletOption)}
                image={typeof finalIconOrImage === "string" ? finalIconOrImage : undefined}
                icon={typeof finalIconOrImage !== "string" ? finalIconOrImage : undefined}
                disabled={disabled}
                postfixText={disabled ? "Coming Soon" : undefined}
            />
        );
    };

    return (
        <>
            <div id="asset-section" className="">
                <h2 className="text-[16px] font-medium mb-2">{t("claim.asset")}</h2>
                <div className="light-borders-green px-4 py-3 flex flex-col gap-3">
                    {link?.asset_info
                        .sort((a, b) => {
                            return (a.address ?? "").localeCompare(b.address ?? "");
                        })
                        .map((asset, index) => <TokenItem key={index} asset={asset} />)}
                </div>
            </div>

            <div className="mt-4">
                <h2 className="text-[16px] font-medium mb-2">{t("claim.receive_options")}</h2>

                <div className="flex flex-col gap-2">
                    {renderWalletButton(WALLET_OPTIONS.GOOGLE, "Google login", undefined, true)}
                    {renderWalletButton(WALLET_OPTIONS.INTERNET_IDENTITY, "Internet Identity")}
                    {renderWalletButton(WALLET_OPTIONS.OTHER, "Other wallets")}
                    {identity ? (
                        <WalletButton
                            title={t("claim.addressPlaceholder")}
                            disabled={true}
                            postfixText={t("claim.addressPlaceholderComingSoon")}
                            className="opacity-50 cursor-not-allowed"
                            handleConnect={() => {
                                // TODO: Enable when working
                                return;
                                showDialog({
                                    title: "Are you sure?",
                                    description:
                                        "You need to disconnect your current wallet to enter an address manually. Would you like to disconnect and continue?",
                                });
                            }}
                            icon={<LuWallet2 color="#359F89" className="mr-2 h-6 w-6" />}
                        />
                    ) : (
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem className="mx-0">
                                    <FormControl>
                                        <IconInput
                                            disabled
                                            isCurrencyInput={false}
                                            icon={
                                                <IoWalletOutline
                                                    color="#359F89"
                                                    className="mr-2 h-6 w-6"
                                                />
                                            }
                                            rightIcon={
                                                <span className="text-[14px]">Coming Soon</span>
                                            }
                                            onRightIconClick={() => {
                                                field.value
                                                    ? field.onChange("")
                                                    : handlePasteClick(field);
                                            }}
                                            placeholder={t("claim.addressPlaceholder")}
                                            className="py-0 h-12 text-md placeholder:text-primary bg-gray-100 text-gray-500 cursor-not-allowed"
                                            onFocusShowIcon={false}
                                            onFocusText={true}
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                validateAddress(e.target.value);
                                            }}
                                        />
                                    </FormControl>
                                    {form.formState.errors.address?.message ===
                                    "wallet-format-error" ? (
                                        <ErrorMessageWithIcon message="The wallet format is incorrect. Please make sure you are entering the correct wallet." />
                                    ) : (
                                        <FormMessage />
                                    )}
                                </FormItem>
                            )}
                        />
                    )}
                </div>
            </div>

            <WalletConnectDialog
                open={isWalletDialogOpen}
                onOpenChange={setIsWalletDialogOpen}
                walletOptions={dialogOptions}
                title="Connect your wallet"
                viewAllLink={false}
            />

            <ConfirmDialog
                open={open}
                title={options.title}
                description={options.description}
                actionText="Disconnect"
                onSubmit={() => {
                    console.log("Disconnecting wallet...");
                    disconnect();
                    form.setValue("address", "");
                    form.clearErrors();
                    setCurrentConnectOption(WALLET_OPTIONS.TYPING);
                    hideDialog();
                }}
                onOpenChange={hideDialog}
            />
        </>
    );
};

export default ClaimFormOptions;
