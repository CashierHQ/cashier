import React, { useEffect, useState } from "react";
import { IoIosArrowBack } from "react-icons/io";
import { SlWallet } from "react-icons/sl";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from "@/pages/[id]";
import { z } from "zod";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { IoWallet } from "react-icons/io5";
import { IconInput } from "../icon-input";
import WalletButton from "./connect-wallet-button";
import { useAuth, useIdentity } from "@nfid/identitykit/react";
import CustomConnectedWalletButton from "./connected-wallet-button";

interface ClaimPageFormProps {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    formData: LinkDetailModel;
    handleClaim: () => void;
    setIsClaiming: (value: boolean) => void;
}

const ClaimPageForm: React.FC<ClaimPageFormProps> = ({
    form,
    handleClaim,
    formData,
    setIsClaiming,
}) => {
    const { t } = useTranslation();
    const { connect, user } = useAuth();
    const identity = useIdentity();
    const [selectOptionWallet, setSelectOptionWallet] = useState("");

    const handleConnectWallet = () => {
        connect();
    };

    useEffect(() => {
        console.log(selectOptionWallet);
    }, [selectOptionWallet]);

    return (
        <>
            <div className="w-full flex justify-center items-center mt-5 relative">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center">
                    {t("claim.receive")}
                </h4>
                <div className="absolute left-[10px]" onClick={() => setIsClaiming(false)}>
                    <IoIosArrowBack />
                </div>
            </div>
            <div id="asset-section" className="my-5">
                <h2 className="text-sm font-medium leading-6 text-gray-900 ml-2">
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
                        <div>{formData.title}</div>
                    </div>
                    <div className="text-green">{formData.amountNumber}</div>
                </div>
            </div>

            <Form {...form}>
                <form
                    className="flex flex-col gap-y-[10px] my-5"
                    onSubmit={form.handleSubmit(handleClaim)}
                >
                    <FormLabel id="asset-label">{t("claim.receive_options")}</FormLabel>
                    <div className="ml-1">
                        <WalletButton
                            title="Google login"
                            handleConnect={handleConnectWallet}
                            image="/googleIcon.png"
                            disabled={true}
                            className="mx-1 my-3"
                            postfixText="Coming soon"
                        />

                        <WalletButton
                            title="Internet Identity"
                            handleConnect={handleConnectWallet}
                            image="/icpLogo.png"
                            className="mx-1 my-3"
                        />

                        {identity ? (
                            <CustomConnectedWalletButton
                                handleConnect={handleConnectWallet}
                                connectedAccount={user?.principal.toString()}
                            />
                        ) : (
                            <WalletButton
                                title="Other wallets"
                                handleConnect={handleConnectWallet}
                                disabled={true}
                                className="mx-1 my-3"
                                icon={<SlWallet className="mr-2 h-4 w-4" color="green" />}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <IconInput
                                            isCurrencyInput={false}
                                            icon={<IoWallet />}
                                            placeholder={t("claim.addressPlaceholder")}
                                            onFocus={() => setSelectOptionWallet("Typed Wallet")}
                                            className="py-5"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="fixed bottom-[30px] w-[80vw] max-w-[350px] left-1/2 -translate-x-1/2"
                    >
                        {t("continue")}
                    </Button>
                </form>
            </Form>
        </>
    );
};

export default ClaimPageForm;
