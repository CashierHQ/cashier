import React, { useEffect, useState } from "react";
import { IoIosArrowBack, IoIosCloseCircle } from "react-icons/io";
import { IoWalletOutline } from "react-icons/io5";
import { PiWallet } from "react-icons/pi";
import { HiOutlineWallet } from "react-icons/hi2";
import { IoClose } from "react-icons/io5";
import { MdOutlineContentPaste } from "react-icons/md";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from "@/pages/[id]";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { IconInput } from "../icon-input";
import WalletButton from "./connect-wallet-button";
import { useAuth, useIdentity } from "@nfid/identitykit/react";
import CustomConnectedWalletButton from "./connected-wallet-button";
import { FixedBottomButton } from "../fix-bottom-button";
import { Spinner } from "../ui/spinner";
import ConfirmDialog from "../confirm-dialog";
import { useConfirmDialog } from "@/hooks/useDialog";
import { useSigners } from "@/contexts/signer-list-context";
import { InternetIdentity, NFIDW, Stoic } from "@nfid/identitykit";
import { Principal } from "@dfinity/principal";
import { FaCircleCheck } from "react-icons/fa6";

export interface ClaimLinkDetail {
    title: string;
    amount: number;
}

interface ClaimPageFormProps {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    formData: LinkDetailModel;
    claimLinkDetails: ClaimLinkDetail[];
    onSubmit: (address: string) => void;
    onBack?: () => void;
    isDisabled?: boolean;
}

enum WALLET_OPTIONS {
    GOOGLE = "Google login",
    INTERNET_IDENTITY = "Internet Identity",
    OTHER = "Other wallets",
    TYPING = "Typing",
}

const ClaimPageForm: React.FC<ClaimPageFormProps> = ({
    form,
    onSubmit,
    claimLinkDetails,
    onBack,
    isDisabled,
}) => {
    const { t } = useTranslation();
    const { connect, disconnect, user } = useAuth();
    const identity = useIdentity();
    const { open, options, showDialog, hideDialog } = useConfirmDialog();
    const { setSigners } = useSigners();

    const [selectOptionWallet, setSelectOptionWallet] = useState<WALLET_OPTIONS>();
    const [currentSelectOptionWallet, setCurrentSelectOptionWallet] = useState<WALLET_OPTIONS>();

    const handleConnectWallet = (selectOption: WALLET_OPTIONS) => {
        if ((form.getValues("address") ?? "").trim().length > 0) {
            showDialog({
                title: "Are you sure?",
                description:
                    "You are connected to another wallet. Would you like to disconnect and continue?",
            });
            return;
        }

        if (identity && selectOption !== currentSelectOptionWallet) {
            showDialog({
                title: "Are you sure?",
                description:
                    "You are connected to another wallet. Would you like to disconnect and continue?",
            });
            return;
        }
        if (selectOption === WALLET_OPTIONS.OTHER) {
            setSigners([NFIDW, Stoic]);
        } else if (selectOption === WALLET_OPTIONS.INTERNET_IDENTITY) {
            setSigners([InternetIdentity]);
        }
        connect();
        setSelectOptionWallet(selectOption);
    };

    const handlePasteClick = async (field: { onChange: (value: string) => void }) => {
        try {
            const text = await navigator.clipboard.readText();
            field.onChange(text);
            // Add validation for pasted text
            try {
                if (text) {
                    Principal.fromText(text);
                    form.clearErrors("address");
                } else {
                    form.clearErrors("address");
                }
            } catch {
                form.setError("address", {
                    type: "manual",
                    message: "Invalid address format",
                });
            }
        } catch (err) {
            console.error("Failed to read clipboard contents: ", err);
        }
    };

    const handleRemoveAllText = (field: { onChange: (value: string) => void }) => {
        field.onChange("");
        form.clearErrors("address");
    };

    useEffect(() => {
        if (identity && selectOptionWallet) {
            setCurrentSelectOptionWallet(selectOptionWallet);
        }
        // If user already connect wallet, then use the connected wallet address
        if (identity) {
            form.setValue("address", user?.principal.toString());
        }
    }, [selectOptionWallet, identity]);

    useEffect(() => {
        console.log(currentSelectOptionWallet);
    }, [currentSelectOptionWallet]);

    useEffect(() => {
        if (identity) {
            setCurrentSelectOptionWallet(WALLET_OPTIONS.INTERNET_IDENTITY);
        }
    }, []);

    return (
        <div className="flex flex-col">
            <div className="flex-1">
                <div className="w-full flex justify-center items-center mt-5 relative">
                    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center">
                        {t("claim.receive")}
                    </h4>
                    <div className="absolute left-[10px]" onClick={onBack}>
                        <IoIosArrowBack />
                    </div>
                </div>

                <div id="asset-section" className="w-full my-5">
                    <h2 className="text-md font-medium leading-6 text-gray-900 ml-2">
                        {t("claim.asset")}
                    </h2>
                    <div id="asset-detail" className="flex justify-between ml-1">
                        <div className="flex items-center">
                            <div className="flex gap-x-5 items-center">
                                <img
                                    src="/icpLogo.png"
                                    alt="link"
                                    className="w-10 h-10 rounded-sm mr-3"
                                />
                            </div>
                            <div>{claimLinkDetails[0].title}</div>
                        </div>
                        {claimLinkDetails[0].amount ? (
                            <div className="text-green">{claimLinkDetails[0].amount}</div>
                        ) : (
                            <Spinner width={22} />
                        )}
                    </div>
                </div>

                <Form {...form}>
                    <form
                        className="w-full flex flex-col gap-y-[10px] my-5"
                        onSubmit={(e) => {
                            e.preventDefault();
                            onSubmit(form.getValues("address") ?? "");
                        }}
                    >
                        <h2 className="text-md font-medium leading-6 text-gray-900 ml-2">
                            {t("claim.receive_options")}
                        </h2>
                        <div className="px-1">
                            {/* Google login */}
                            <WalletButton
                                title="Google login"
                                handleConnect={() => handleConnectWallet(WALLET_OPTIONS.GOOGLE)}
                                image="/googleIcon.png"
                                disabled={true}
                                postfixText="Coming soon"
                            />

                            {/* Internet Identity */}
                            {identity &&
                            currentSelectOptionWallet === WALLET_OPTIONS.INTERNET_IDENTITY ? (
                                <CustomConnectedWalletButton
                                    connectedAccount={user?.principal.toString()}
                                    postfixText="Connected"
                                    postfixIcon={
                                        <img
                                            src="/icpLogo.png"
                                            alt="icp"
                                            className="w-6 h-6 mr-2"
                                        />
                                    }
                                />
                            ) : (
                                <WalletButton
                                    title="Internet Identity"
                                    handleConnect={() =>
                                        handleConnectWallet(WALLET_OPTIONS.INTERNET_IDENTITY)
                                    }
                                    image="/icpLogo.png"
                                />
                            )}

                            {/* Other wallets */}
                            {identity && currentSelectOptionWallet === WALLET_OPTIONS.OTHER ? (
                                <CustomConnectedWalletButton
                                    connectedAccount={user?.principal.toString()}
                                    postfixText="Connected"
                                />
                            ) : (
                                <WalletButton
                                    title="Other wallets"
                                    handleConnect={() => handleConnectWallet(WALLET_OPTIONS.OTHER)}
                                    disabled={false}
                                    icon={
                                        <HiOutlineWallet className="mr-2 h-6 w-6" color="green" />
                                    }
                                />
                            )}

                            {/* Manually typing address */}
                            {identity ? (
                                <WalletButton
                                    title={t("claim.addressPlaceholder")}
                                    handleConnect={() => handleConnectWallet(WALLET_OPTIONS.TYPING)}
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
                                                        field.value &&
                                                        form.formState.errors.address ? (
                                                            <IoIosCloseCircle
                                                                color="red"
                                                                className="mr-1 h-6 w-6"
                                                            />
                                                        ) : field.value &&
                                                          !form.formState.errors.address ? (
                                                            <FaCircleCheck
                                                                color="#36A18B"
                                                                className="mr-1 h-6 w-6"
                                                            />
                                                        ) : (
                                                            <MdOutlineContentPaste
                                                                color="green"
                                                                className="mr-2 h-5 w-5"
                                                            />
                                                        )
                                                    }
                                                    onRightIconClick={() =>
                                                        field.value
                                                            ? handleRemoveAllText(field)
                                                            : handlePasteClick(field)
                                                    }
                                                    placeholder={t("claim.addressPlaceholder")}
                                                    className="py-5 h-14 text-md rounded-xl"
                                                    onFocusShowIcon={true}
                                                    onFocusText={true}
                                                    {...field}
                                                    onChange={(e) => {
                                                        console.log("Change address", e);
                                                        field.onChange(e);
                                                        // Validate the address format
                                                        try {
                                                            if (e.target.value) {
                                                                Principal.fromText(e.target.value);
                                                                form.clearErrors("address");
                                                            } else {
                                                                form.clearErrors("address");
                                                            }
                                                        } catch {
                                                            form.setError("address", {
                                                                type: "manual",
                                                                message: "Invalid address format",
                                                            });
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white">
                            <FixedBottomButton
                                type="submit"
                                variant="default"
                                size="lg"
                                className="w-full"
                                disabled={isDisabled}
                            >
                                {isDisabled ? t("processing") : t("claim.claim")}
                            </FixedBottomButton>
                        </div>
                    </form>
                </Form>
            </div>

            <ConfirmDialog
                open={open}
                title={options.title}
                description={options.description}
                actionText="Disconnect"
                onSubmit={() => {
                    disconnect();
                    form.setValue("address", "");
                    form.clearErrors();
                    hideDialog();
                }}
                onOpenChange={hideDialog}
            />
        </div>
    );
};

export default ClaimPageForm;
