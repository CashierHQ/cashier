// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useCallback } from "react";
import {
    useSubmissionHandler,
    FormSubmissionContext,
    TemplateSubmissionContext,
} from "./useSubmissionHandler";
import { useLinkTemplateValidation } from "./useLinkTemplateValidation";
import { useLinkCreationFormStore } from "@/stores/linkCreationFormStore";
import { useCarousel } from "@/components/link-template/link-template.hooks";
import { LINK_TYPE } from "@/services/types/enum";
import { FormAsset } from "@/types/validation.types";
import { LinkDetailModel } from "@/services/types/link.service.types";

/**
 * Hook for handling form submissions in link detail forms
 * (SendTipForm, SendAirdropForm, SendTokenBasketForm, ReceivePaymentForm)
 */
export const useFormSubmissionHandler = (link: LinkDetailModel) => {
    const { handleFormSubmission } = useSubmissionHandler(link);

    const submitForm = useCallback(
        async (
            linkId: string,
            formAssets: FormAsset[],
            maxActionNumber: number,
            linkType: LINK_TYPE,
            options?: {
                skipBalanceCheck?: boolean;
                isAirdrop?: boolean;
                errorHandler?: (error: Error) => void;
            },
        ) => {
            const context: FormSubmissionContext = {
                linkId,
                formAssets,
                maxActionNumber,
                linkType,
                skipBalanceCheck: options?.skipBalanceCheck,
                isAirdrop: options?.isAirdrop,
                errorHandler: options?.errorHandler,
            };

            await handleFormSubmission(context);
        },
        [handleFormSubmission],
    );

    return { submitForm };
};

/**
 * Hook for handling template submissions
 * (LinkTemplate component)
 */
export const useLinkTemplateHandler = (link: LinkDetailModel) => {
    const { handleTemplateSubmission } = useSubmissionHandler(link);
    const { validateLinkTemplate, isLinkTypeSupported } = useLinkTemplateValidation();
    const { getUserInput } = useLinkCreationFormStore();
    const carousel = useCarousel();

    const submitTemplate = useCallback(
        async (onUnsupportedType: () => void, errorHandler?: (error: Error) => void) => {
            const currentLink = link ? getUserInput(link.id) : undefined;

            const context: TemplateSubmissionContext = {
                currentLink: currentLink || {},
                carouselIndex: carousel.current,
                validateTemplate: validateLinkTemplate,
                isLinkTypeSupported,
                onUnsupportedType,
                errorHandler,
            };

            await handleTemplateSubmission(context);
        },
        [
            handleTemplateSubmission,
            validateLinkTemplate,
            isLinkTypeSupported,
            getUserInput,
            link,
            carousel,
        ],
    );

    return { submitTemplate };
};

/**
 * Hook specifically for SendTipForm component
 */
export const useSendTipFormHandler = (link: LinkDetailModel) => {
    const { submitForm } = useFormSubmissionHandler(link);

    const submitTipForm = useCallback(
        async (
            linkId: string,
            formAssets: FormAsset[],
            maxActionNumber: number,
            errorHandler?: (error: Error) => void,
        ) => {
            await submitForm(linkId, formAssets, maxActionNumber, LINK_TYPE.SEND_TIP, {
                skipBalanceCheck: false,
                isAirdrop: false,
                errorHandler,
            });
        },
        [submitForm],
    );

    return { submitTipForm };
};

/**
 * Hook specifically for SendAirdropForm component
 */
export const useSendAirdropFormHandler = (link: LinkDetailModel) => {
    const { submitForm } = useFormSubmissionHandler(link);

    const submitAirdropForm = useCallback(
        async (
            linkId: string,
            formAssets: FormAsset[],
            maxActionNumber: number,
            errorHandler?: (error: Error) => void,
        ) => {
            await submitForm(linkId, formAssets, maxActionNumber, LINK_TYPE.SEND_AIRDROP, {
                skipBalanceCheck: false,
                isAirdrop: true,
                errorHandler,
            });
        },
        [submitForm],
    );

    return { submitAirdropForm };
};

/**
 * Hook specifically for SendTokenBasketForm component
 */
export const useSendTokenBasketFormHandler = (link: LinkDetailModel) => {
    const { submitForm } = useFormSubmissionHandler(link);

    const submitTokenBasketForm = useCallback(
        async (
            linkId: string,
            formAssets: FormAsset[],
            maxActionNumber: number,
            errorHandler?: (error: Error) => void,
        ) => {
            await submitForm(linkId, formAssets, maxActionNumber, LINK_TYPE.SEND_TOKEN_BASKET, {
                skipBalanceCheck: false,
                isAirdrop: false,
                errorHandler,
            });
        },
        [submitForm],
    );

    return { submitTokenBasketForm };
};

/**
 * Hook specifically for ReceivePaymentForm component
 */
export const useReceivePaymentFormHandler = (link: LinkDetailModel) => {
    const { submitForm } = useFormSubmissionHandler(link);

    const submitReceivePaymentForm = useCallback(
        async (
            linkId: string,
            formAssets: FormAsset[],
            maxActionNumber: number,
            errorHandler?: (error: Error) => void,
        ) => {
            await submitForm(linkId, formAssets, maxActionNumber, LINK_TYPE.RECEIVE_PAYMENT, {
                skipBalanceCheck: true,
                isAirdrop: false,
                errorHandler,
            });
        },
        [submitForm],
    );

    return { submitReceivePaymentForm };
};
