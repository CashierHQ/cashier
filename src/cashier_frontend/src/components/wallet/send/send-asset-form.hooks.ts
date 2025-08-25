// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { convertTokenAmountToNumber } from "@/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { DefaultValues, useForm, UseFormReturn } from "react-hook-form";
import { useCallback, useEffect } from "react";
import * as z from "zod";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { Principal } from "@dfinity/principal";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

const isValidWalletAddress = (
  address: string,
): { valid: boolean; message: string } => {
  // Empty string handling
  if (!address.trim()) {
    return { valid: false, message: "Wallet address is required" };
  }

  // ICP Principal ID validation
  if (/^[a-z0-9\-]+$/.test(address)) {
    try {
      Principal.fromText(address);
      return { valid: true, message: "" };
    } catch {
      return { valid: false, message: "Invalid ICP Principal ID format" };
    }
  }

  // ETH-style address validation (0x followed by 40 hex characters)
  // if (tokenAddress?.startsWith("0x") || address.startsWith("0x")) {
  //     if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
  //         return { valid: true, message: "" };
  //     }
  //     return { valid: false, message: "Invalid ETH address format" };
  // }

  // Default length check (basic validation)
  if (address.length < 10) {
    return { valid: false, message: "Wallet address is too short" };
  }

  return { valid: false, message: "Unknown error" };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const walletSendAssetFormSchema = (assets: FungibleToken[]) => {
  return z
    .object({
      address: z.string().min(1, { message: "Asset is required" }),
      amount: z.bigint(),
      assetNumber: z
        .number({ message: "Must input number" })
        .positive({ message: "Must be greater than 0" })
        .nullable(),
      walletAddress: z
        .string()
        .min(1, { message: "Wallet address is required" }),
    })
    .superRefine((val, ctx) => {
      console.log("val", val);
      // Existing validation for assetNumber
      if (val.assetNumber === null) {
        ctx.addIssue({
          code: "custom",
          message: "Must input number",
          path: ["assetNumber"],
        });
      }

      // Add custom wallet address validation
      const addressValidation = isValidWalletAddress(val.walletAddress);
      if (!addressValidation.valid) {
        ctx.addIssue({
          code: "custom",
          message: addressValidation.message,
          path: ["walletAddress"],
        });
      }
    });
};

export type WalletSendAssetFormSchema = z.infer<
  ReturnType<typeof walletSendAssetFormSchema>
>;

export function useWalletSendAssetForm(
  assets: FungibleToken[],
  defaultValues?: DefaultValues<WalletSendAssetFormSchema>,
): UseFormReturn<WalletSendAssetFormSchema> {
  const form = useForm<WalletSendAssetFormSchema>({
    resolver: zodResolver(walletSendAssetFormSchema(assets)),
    defaultValues: defaultValues,
    mode: "onChange", // Enable validation on change
  });

  const { getToken } = useTokensV2();

  const tokenAddress = form.watch("address");
  const token = getToken(tokenAddress);

  const assetNumber = form.watch("assetNumber");
  const walletAddress = form.watch("walletAddress");

  // Validate wallet address whenever it changes
  useEffect(() => {
    if (walletAddress) {
      const validation = isValidWalletAddress(walletAddress);
      if (!validation.valid) {
        form.setError("walletAddress", {
          type: "manual",
          message: validation.message,
        });
      } else {
        form.clearErrors("walletAddress");
      }
    }
  }, [walletAddress, form]);

  useEffect(() => {
    if (assetNumber && token && token.decimals !== undefined) {
      form.setValue(
        "amount",
        BigInt(convertTokenAmountToNumber(assetNumber, token.decimals)),
      );
    }
  }, [assetNumber, token, form]);

  return form;
}

export function useWalletSendAssetFormActions(
  form: UseFormReturn<WalletSendAssetFormSchema>,
) {
  const tokenAddress = form.watch("address");
  const { getTokenPrice } = useTokensV2();
  const tokenUsdPrice = getTokenPrice(tokenAddress);

  const setTokenAmount = useCallback(
    (input: string | number) => {
      const value = parseFloat(input.toString());
      const isValidValue = !isNaN(value);
      form.setValue("assetNumber", isValidValue ? value : null, {
        shouldTouch: true,
      });

      if (!tokenUsdPrice) return;

      // No need to set USD value here as we removed the usdNumber field
    },
    [tokenUsdPrice],
  );

  const setUsdAmount = useCallback(
    (input: string | number) => {
      const value = parseFloat(input.toString());
      const isValidValue = !isNaN(value);

      if (!tokenUsdPrice) return;

      const convertedValue = value / tokenUsdPrice; // USD to token conversion
      form.setValue("assetNumber", isValidValue ? convertedValue : 0, {
        shouldTouch: true,
      });
    },
    [tokenUsdPrice],
  );

  const setTokenAddress = useCallback((address: string) => {
    form.setValue("address", address, { shouldTouch: true });
    form.clearErrors("amount");
    form.clearErrors("assetNumber");
  }, []);

  const setWalletAddress = useCallback((address: string) => {
    form.setValue("walletAddress", address, { shouldTouch: true });
  }, []);

  return {
    setTokenAmount,
    setUsdAmount,
    setTokenAddress,
    setWalletAddress,
  };
}
