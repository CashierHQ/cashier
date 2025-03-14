import React, { useEffect, useState } from "react";
import { IoIosArrowBack } from "react-icons/io";
import { SlWallet } from "react-icons/sl";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from "@/pages/[id]";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { IoWallet } from "react-icons/io5";
import { IconInput } from "../icon-input";
import WalletButton from "./connect-wallet-button";
import { useAuth, useIdentity } from "@nfid/identitykit/react";
import CustomConnectedWalletButton from "./connected-wallet-button";
import { FixedBottomButton } from "../fix-bottom-button";
import { Spinner } from "../ui/spinner";

interface ClaimLinkDetail {
    title: string;
    amount: number;
}

interface ClaimPageFormProps {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    formData: LinkDetailModel;
    claimLinkDetails: ClaimLinkDetail[];
    handleClaim: () => void;
    setIsClaiming: () => void;
}

enum WALLET_OPTIONS {
    GOOGLE = "Google login",
    INTERNET_IDENTITY = "Internet Identity",
    OTHER = "Other wallets",
    TYPING = "Typing",
}

const ClaimPageForm: React.FC<ClaimPageFormProps> = ({
    form,
    handleClaim,
    formData,
    claimLinkDetails,
    setIsClaiming,
}) => {
    console.log("🚀 ~ form:", form.getValues());
    const { t } = useTranslation();
    const { connect, disconnect, user } = useAuth();
    const identity = useIdentity();
    const [selectOptionWallet, setSelectOptionWallet] = useState<WALLET_OPTIONS>();
    const [currentSelectOptionWallet, setCurrentSelectOptionWallet] = useState<WALLET_OPTIONS>();

    const handleConnectWallet = (selectOption: WALLET_OPTIONS) => {
        if (identity && selectOption !== currentSelectOptionWallet) {
            console.log("Do you want to log out");
            disconnect();
            return;
        }
        connect();
        setSelectOptionWallet(selectOption);
    };

    useEffect(() => {
        if (identity && selectOptionWallet) {
            setCurrentSelectOptionWallet(selectOptionWallet);
        }
    }, [selectOptionWallet, identity]);

    useEffect(() => {
        console.log(currentSelectOptionWallet);
    }, [currentSelectOptionWallet]);

    return (
        <>
            <div className="w-full flex justify-center items-center mt-5 relative">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center">
                    {t("claim.receive")}
                </h4>
                <div className="absolute left-[10px]" onClick={setIsClaiming}>
                    <IoIosArrowBack />
                </div>
            </div>
            <div id="asset-section" className="my-5">
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
                    className="flex flex-col gap-y-[10px] my-5"
                    onSubmit={form.handleSubmit(handleClaim)}
                >
                    <h2 className="text-md font-medium leading-6 text-gray-900 ml-2">
                        {t("claim.receive_options")}
                    </h2>
                    <div className="ml-1">
                        <WalletButton
                            title="Google login"
                            handleConnect={() => handleConnectWallet(WALLET_OPTIONS.GOOGLE)}
                            image="/googleIcon.png"
                            disabled={true}
                            postfixText="Coming soon"
                        />

                        {identity ? (
                            <CustomConnectedWalletButton
                                connectedAccount={user?.principal.toString()}
                                postfixText="Connected"
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

                        {currentSelectOptionWallet === WALLET_OPTIONS.OTHER ? (
                            <CustomConnectedWalletButton
                                connectedAccount={user?.principal.toString()}
                            />
                        ) : (
                            <WalletButton
                                title="Other wallets"
                                handleConnect={() => handleConnectWallet(WALLET_OPTIONS.OTHER)}
                                disabled={false}
                                icon={<SlWallet className="mr-2 h-6 w-6" color="green" />}
                            />
                        )}

                        {/* Manually typing address */}
                        {identity ? (
                            <WalletButton
                                title={t("claim.addressPlaceholder")}
                                handleConnect={() => handleConnectWallet(WALLET_OPTIONS.TYPING)}
                                icon={<IoWallet color="green" className="mr-2 h-6 w-6" />}
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
                                                    <IoWallet
                                                        color="green"
                                                        className="mr-2 h-6 w-6"
                                                    />
                                                }
                                                placeholder={t("claim.addressPlaceholder")}
                                                className="py-5 h-12 text-md"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>

                    <FixedBottomButton
                        type="submit"
                        variant="default"
                        size="lg"
                        onClick={() => console.log(form.formState.errors)}
                    >
                        {t("claim.claim")}
                    </FixedBottomButton>

                    {/* <Button
                        type="submit"
                        className="fixed bottom-[30px] w-[80vw] max-w-[350px] left-1/2 -translate-x-1/2"
                    >
                        {t("continue")}
                    </Button> */}
                </form>
            </Form>
        </>
    );
};

export default ClaimPageForm;
