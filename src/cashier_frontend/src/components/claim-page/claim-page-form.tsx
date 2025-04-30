import React, { useEffect } from "react";
import { IoIosArrowBack, IoMdClose } from "react-icons/io";
import { IoWalletOutline } from "react-icons/io5";
import { PiWallet } from "react-icons/pi";
import { HiOutlineWallet } from "react-icons/hi2";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from "@/pages/[id]";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { IconInput } from "../icon-input";
import WalletButton from "./connect-wallet-button";
import { useAuth, useIdentity, useSigner } from "@nfid/identitykit/react";
import CustomConnectedWalletButton from "./connected-wallet-button";
import { FixedBottomButton } from "../fix-bottom-button";
import ConfirmDialog from "../confirm-dialog";
import { useConfirmDialog } from "@/hooks/useDialog";
import { Principal } from "@dfinity/principal";
import { FaCheck } from "react-icons/fa6";
import { ErrorMessageWithIcon } from "@/components/ui/error-message-with-icon";
import { useSignerStore, WALLET_OPTIONS } from "@/stores/signerStore";
import { useConnectToWallet } from "@/hooks/user-hook";
import { useParams } from "react-router-dom";
import { ACTION_TYPE, LINK_TYPE } from "@/services/types/enum";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { useTokens } from "@/hooks/useTokens";
import { ClipboardIcon } from "lucide-react";
import TokenItem from "./token-item";

interface ClaimPageFormProps {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    formData: LinkDetailModel;
    onSubmit: (address: string) => void;
    onBack?: () => void;
    isDisabled?: boolean;
    setDisabled?: (disabled: boolean) => void;
    buttonText?: string;
}

const ClaimPageForm: React.FC<ClaimPageFormProps> = ({
    form,
    onSubmit,
    onBack,
    isDisabled,
    setDisabled,
    buttonText,
}) => {
    const { t } = useTranslation();
    const { user, disconnect } = useAuth();
    const identity = useIdentity();
    const { open, options, hideDialog, showDialog } = useConfirmDialog();
    const signer = useSigner();
    const { connectToWallet } = useConnectToWallet();
    const { setCurrentConnectOption, initInternetIdentitySigner, initOtherWalletSigners } =
        useSignerStore();
    const { linkId } = useParams();

    const { link } = useLinkAction(linkId, ACTION_TYPE.CLAIM_LINK);
    const { getToken, updateTokenInit } = useTokens();

    // Check if the address is valid
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

    const getTokenData = (address: string) => {
        const token = getToken(address);
        return token;
    };

    useEffect(() => {
        updateTokenInit();
    }, []);

    useEffect(() => {
        console.log("signer", signer);
    }, [signer]);

    // Update disabled state based on identity or address validation
    useEffect(() => {
        if (setDisabled) {
            // Enable button if user has connected wallet or entered valid address
            const shouldEnable = !!identity || isAddressValid();
            setDisabled(!shouldEnable);
        }
    }, [setDisabled, isAddressValid]);

    // Watch for address changes to update the disabled state
    useEffect(() => {
        const subscription = form.watch(() => {
            if (setDisabled) {
                const shouldEnable = !!identity || isAddressValid();
                setDisabled(!shouldEnable);
            }
        });

        return () => subscription.unsubscribe();
    }, [form, setDisabled]);

    const handleConnectWallet = (walletOption: WALLET_OPTIONS) => {
        if ((form.getValues("address") ?? "").trim().length > 0) {
            showDialog({
                title: "Are you sure?",
                description:
                    "You are connected to another wallet. Would you like to disconnect and continue?",
            });
            return;
        }

        if (identity) {
            showDialog({
                title: "Are you sure?",
                description:
                    "You are connected to another wallet. Would you like to disconnect and continue?",
            });
            return;
        }

        setCurrentConnectOption(walletOption);

        if (walletOption === WALLET_OPTIONS.INTERNET_IDENTITY) {
            initInternetIdentitySigner();
            if (!identity) {
                connectToWallet("InternetIdentity");
            }
        } else if (walletOption === WALLET_OPTIONS.OTHER) {
            initOtherWalletSigners();
            if (!identity) {
                connectToWallet();
            }
        } else if (walletOption === WALLET_OPTIONS.GOOGLE) {
            initOtherWalletSigners();
            if (!identity) {
                connectToWallet("https://login.f0i.de/");
            }
        }
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
                    // Update disabled state when address is valid
                    if (setDisabled) {
                        setDisabled(false);
                    }
                } else {
                    form.clearErrors("address");
                    // Update disabled state when address is empty
                    if (setDisabled && !identity) {
                        setDisabled(true);
                    }
                }
            } catch {
                form.setError("address", {
                    type: "manual",
                    message: "Invalid address format",
                });
                // Update disabled state when address is invalid
                if (setDisabled && !identity) {
                    setDisabled(true);
                }
            }
        } catch (err) {
            console.error("Failed to read clipboard contents: ", err);
        }
    };

    // Ensure we immediately update the button state when isDisabled prop changes
    useEffect(() => {
        // This effect ensures the button's disabled state is controlled by the parent component
        if (setDisabled && isDisabled !== undefined) {
            setDisabled(isDisabled);
        }
    }, [isDisabled, setDisabled]);

    return (
        <>
            <div className="w-full flex flex-col flex-grow relative">
                <div className="w-full flex justify-center items-center relative">
                    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center">
                        {link?.linkType != LINK_TYPE.RECEIVE_PAYMENT && t("claim.receive")}
                        {link?.linkType == LINK_TYPE.RECEIVE_PAYMENT && t("claim.payment")}
                    </h4>
                    <div className="absolute left-[10px]" onClick={onBack}>
                        <IoIosArrowBack />
                    </div>
                </div>

                <div id="asset-section" className="w-full my-5">
                    <h2 className="text-md font-medium leading-6 text-gray-900 ml-2">
                        {t("claim.asset")}
                    </h2>
                    {link?.asset_info.map((asset, index) => (
                        <TokenItem key={index} asset={asset} />
                    ))}
                </div>

                <Form {...form}>
                    <form
                        className="w-full flex flex-col gap-y-[10px] mt-5 h-full"
                        onSubmit={(e) => {
                            e.preventDefault();
                            // Disable the button immediately on submission
                            if (setDisabled) {
                                setDisabled(true);
                            }
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
                                handleConnect={() => {
                                    handleConnectWallet(WALLET_OPTIONS.GOOGLE);
                                }}
                                image="/googleIcon.png"
                            />

                            {/* Internet Identity */}
                            {identity && signer?.id === "InternetIdentity" ? (
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
                                    handleConnect={() => {
                                        handleConnectWallet(WALLET_OPTIONS.INTERNET_IDENTITY);
                                    }}
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
                            {identity && signer?.id !== "InternetIdentity" ? (
                                <CustomConnectedWalletButton
                                    connectedAccount={user?.principal.toString()}
                                    postfixText="Connected"
                                    handleConnect={() => handleConnectWallet(WALLET_OPTIONS.OTHER)}
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
                                                        field.value &&
                                                        form.formState.errors.address ? (
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
                                                        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                                        field.value
                                                            ? field.onChange("")
                                                            : handlePasteClick(field);
                                                    }}
                                                    placeholder={t("claim.addressPlaceholder")}
                                                    className="py-5 h-14 text-md rounded-xl placeholder:text-primary"
                                                    onFocusShowIcon={true}
                                                    onFocusText={true}
                                                    // disabled={!!identity}
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        // Validate the address format
                                                        try {
                                                            if (e.target.value) {
                                                                Principal.fromText(e.target.value);
                                                                form.clearErrors("address");
                                                                // Update disabled state when address is valid
                                                                if (setDisabled) {
                                                                    setDisabled(false);
                                                                }
                                                            } else {
                                                                form.clearErrors("address");
                                                                // Update disabled state when address is empty
                                                                if (setDisabled && !identity) {
                                                                    setDisabled(true);
                                                                }
                                                            }
                                                        } catch {
                                                            form.setError("address", {
                                                                type: "manual",
                                                                message: "wallet-format-error",
                                                            });
                                                            // Update disabled state when address is invalid
                                                            if (setDisabled && !identity) {
                                                                setDisabled(true);
                                                            }
                                                        }
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

                        <FixedBottomButton
                            type="submit"
                            variant="default"
                            size="lg"
                            className="w-full mt-auto disabled:bg-disabledgreen"
                            disabled={isDisabled}
                        >
                            {buttonText ?? t("claim.claim")}
                        </FixedBottomButton>
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
                    setCurrentConnectOption(WALLET_OPTIONS.TYPING);
                    hideDialog();
                }}
                onOpenChange={hideDialog}
            />
        </>
    );
};

export default ClaimPageForm;
