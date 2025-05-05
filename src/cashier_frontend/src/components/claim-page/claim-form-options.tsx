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

    const { link } = useLinkAction(linkId, ACTION_TYPE.CLAIM_LINK);
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
                />
            );
        }

        return (
            <WalletButton
                title={title}
                handleConnect={() => handleConnectWallet(walletOption)}
                image={typeof finalIconOrImage === "string" ? finalIconOrImage : undefined}
                icon={typeof finalIconOrImage !== "string" ? finalIconOrImage : undefined}
            />
        );
    };

    return (
        <>
            <div id="asset-section" className="w-full my-5">
                <h2 className="text-md font-medium leading-6 text-gray-900 ml-2">
                    {t("claim.asset")}
                </h2>
                {link?.asset_info.map((asset, index) => <TokenItem key={index} asset={asset} />)}
            </div>

            <div className="w-full flex flex-col gap-y-[10px] mt-5">
                <h2 className="text-md font-medium leading-6 text-gray-900 ml-2">
                    {t("claim.receive_options")}
                </h2>

                <div className="px-1">
                    {renderWalletButton(WALLET_OPTIONS.GOOGLE, "Google login")}
                    {renderWalletButton(WALLET_OPTIONS.INTERNET_IDENTITY, "Internet Identity")}
                    {renderWalletButton(WALLET_OPTIONS.OTHER, "Other wallets")}
                    {identity ? (
                        <WalletButton
                            title={t("claim.addressPlaceholder")}
                            handleConnect={() => {
                                showDialog({
                                    title: "Are you sure?",
                                    description:
                                        "You need to disconnect your current wallet to enter an address manually. Would you like to disconnect and continue?",
                                });
                            }}
                            icon={<PiWallet color="green" className="mr-2 h-6 w-6" />}
                        />
                    ) : (
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem className="mx-0">
                                    <FormControl>
                                        <IconInput
                                            isCurrencyInput={false}
                                            icon={
                                                <IoWalletOutline
                                                    color="green"
                                                    className="mr-2 h-6 w-6"
                                                />
                                            }
                                            rightIcon={
                                                field.value && form.formState.errors.address ? (
                                                    <IoMdClose
                                                        color="red"
                                                        className="mr-1 h-5 w-5"
                                                    />
                                                ) : field.value &&
                                                  !form.formState.errors.address ? (
                                                    <FaCheck
                                                        color="#36A18B"
                                                        className="mr-1 h-5 w-5"
                                                    />
                                                ) : (
                                                    <ClipboardIcon
                                                        color="green"
                                                        className="mr-2 h-5 w-5"
                                                    />
                                                )
                                            }
                                            onRightIconClick={() => {
                                                field.value
                                                    ? field.onChange("")
                                                    : handlePasteClick(field);
                                            }}
                                            placeholder={t("claim.addressPlaceholder")}
                                            className="py-5 h-14 text-md rounded-xl placeholder:text-primary"
                                            onFocusShowIcon={true}
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
