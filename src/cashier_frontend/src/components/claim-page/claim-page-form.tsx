import React, { useEffect, useState } from "react";
import { IoIosArrowBack } from "react-icons/io";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
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

const defaultClaimingAmount = 1;

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
        <div className="w-screen flex flex-col items-center py-5">
            <div className="w-11/12 max-w-[400px]">
                <div className="w-full flex justify-center items-center">
                    <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                </div>
                <div className="w-full flex justify-center items-center mt-5 relative">
                    <h3 className="font-semibold">{t("claim.claim")}</h3>
                    <div className="absolute left-[10px]" onClick={() => setIsClaiming(false)}>
                        <IoIosArrowBack />
                    </div>
                </div>
                <div id="asset-section" className="my-3">
                    <div id="asset-label" className="font-bold mb-3 text-lg">
                        {t("claim.asset")}
                    </div>
                    <div id="asset-detail" className="flex justify-between">
                        <div className="flex items-center">
                            <div className="flex gap-x-5 items-center">
                                <img
                                    src={formData.image}
                                    alt="link"
                                    className="w-10 h-10 rounded-sm mr-3"
                                />
                            </div>
                            <div>{formData.title}</div>
                        </div>
                        <div className="text-green">{defaultClaimingAmount}</div>
                    </div>
                </div>
                <Form {...form}>
                    <form
                        className="flex flex-col gap-y-[10px] my-5"
                        onSubmit={form.handleSubmit(handleClaim)}
                    >
                        <div id="asset-label" className="font-bold text-lg">
                            {t("claim.receive_options")}
                        </div>
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <IconInput
                                            isCurrencyInput={false}
                                            icon={<IoWallet />} // You need to import this icon
                                            placeholder={t("claim.addressPlaceholder")}
                                            onFocus={() => setSelectOptionWallet("Typed Wallet")}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {identity ? (
                            <CustomConnectedWalletButton
                                handleConnect={handleConnectWallet}
                                connectedAccount={user?.principal.toString()}
                            />
                        ) : (
                            <WalletButton handleConnect={handleConnectWallet} />
                        )}

                        <Button
                            type="submit"
                            className="fixed bottom-[30px] w-[80vw] max-w-[350px] left-1/2 -translate-x-1/2"
                        >
                            {t("continue")}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
};

export default ClaimPageForm;
