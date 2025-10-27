# Form Hooks Quick Reference

## Hook Usage Matrix

| Component               | Primary Hook                    | Secondary Hooks          | Validation Type    | Balance Check | Fees Included      |
| ----------------------- | ------------------------------- | ------------------------ | ------------------ | ------------- | ------------------ |
| **SendTipForm**         | `useSendTipFormHandler`         | -                        | Form Submission    | ✅            | Network            |
| **SendAirdropForm**     | `useSendAirdropFormHandler`     | -                        | Form Submission    | ✅            | Network × Claims   |
| **SendTokenBasketForm** | `useSendTokenBasketFormHandler` | -                        | Form Submission    | ✅            | Network            |
| **ReceivePaymentForm**  | `useReceivePaymentFormHandler`  | -                        | Form Submission    | ❌            | None               |
| **LinkPreview**         | `useLinkCreateValidation`       | `useLinkCreationHandler` | Creation + Balance | ✅            | Network + Creation |
| **LinkTemplate**        | `useLinkTemplateValidation`     | `useLinkTemplateHandler` | Template + Support | ❌            | None               |
| **AddAssetForm**        | Direct ValidationService        | -                        | Asset Addition     | ✅            | Network            |

## Token Amount Validation by Use Case

### Form Submission Validation (Create Links)

```typescript
// Formula: asset.amount + networkFee (× maxActionNumber for airdrops)
const result = ValidationService.validateAssetsWithFees(formAssets, tokenMap, {
  useCase: "create",
  linkType: LINK_TYPE.SEND_TIP,
  maxActionNumber: 1,
  includeLinkCreationFee: false,
  skipBalanceCheck: false,
});
```

### Link Creation Validation (Final Submit)

```typescript
// Formula: asset.amount + networkFee + linkCreationFee
const result = ValidationService.validateAssetsWithFees(formAssets, tokenMap, {
  useCase: "create",
  linkType: link.linkType as LINK_TYPE,
  maxActionNumber: actionNum,
  includeLinkCreationFee: true,
  skipBalanceCheck: false,
});
```

### Asset Addition Validation (Real-time)

```typescript
// Formula: asset.amount + networkFee
const result = ValidationService.validateLinkDetailsAssets(
  formAssets,
  undefined,
  {
    isAirdrop: false,
    maxActionNumber: 1,
    skipCheckingBalance: false,
  },
);
```

## Error Message Templates

| Error Code                    | Template Key                                | Variables                                          | Usage            |
| ----------------------------- | ------------------------------------------- | -------------------------------------------------- | ---------------- |
| `INSUFFICIENT_BALANCE`        | `error.balance.insufficient_balance`        | `tokenSymbol`, `available`, `required`             | Form validation  |
| `INSUFFICIENT_BALANCE_CREATE` | `error.balance.insufficient_balance_create` | `tokenSymbol`, `available`, `required`, `linkType` | Link creation    |
| `TOKEN_NOT_FOUND`             | `error.token.not_found`                     | `tokenAddress`                                     | Asset validation |
| `NO_ASSETS_FOUND`             | `error.assets.none_found`                   | -                                                  | Form validation  |
| `LINK_NOT_FOUND`              | `error.resource.link_not_found`             | -                                                  | Link validation  |

## Hook Import Paths

```typescript
// Form submission handlers
import { useSendTipFormHandler } from "@/hooks/form/usePageSubmissionHandlers";
import { useSendAirdropFormHandler } from "@/hooks/form/usePageSubmissionHandlers";
import { useSendTokenBasketFormHandler } from "@/hooks/form/usePageSubmissionHandlers";
import { useReceivePaymentFormHandler } from "@/hooks/form/usePageSubmissionHandlers";

// Validation hooks
import { useLinkCreateValidation } from "@/hooks/form/useLinkCreateValidation";
import { useLinkTemplateValidation } from "@/hooks/form/useLinkTemplateValidation";

// Core submission logic
import { useSubmissionHandler } from "@/hooks/form/useSubmissionHandler";

// Direct validation service
import { ValidationService } from "@/services/validation.service";
```

## Common Patterns

### Form Component Pattern

```typescript
export const MyForm = () => {
    const { submitMyForm } = useMyFormHandler();

    const handleSubmit = async () => {
        const formAssets = getValues("assets");

        await submitMyForm(
            linkId,
            formAssets,
            maxActionNumber,
            (error) => {
                console.error("Submission failed:", error);
                toast.error(error.message);
            }
        );
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* form content */}
        </form>
    );
};
```

### Validation Component Pattern

```typescript
export const MyValidationComponent = () => {
    const { validateWithBalance } = useMyValidationHook();

    const handleValidate = () => {
        const result = validateWithBalance(data, options);

        if (!result.isValid) {
            // Errors automatically shown as toast
            return;
        }

        // Proceed with action
        proceedWithAction();
    };

    return (
        <div>
            <button onClick={handleValidate}>Validate & Continue</button>
        </div>
    );
};
```

### Direct ValidationService Pattern

```typescript
export const useCustomValidation = () => {
  const { createTokenMap } = useTokens();
  const { t } = useTranslation();

  const validateCustom = (assets, options) => {
    const tokenMap = createTokenMap();

    const result = ValidationService.validateAssetsWithFees(assets, tokenMap, {
      useCase: options.useCase,
      linkType: options.linkType,
      maxActionNumber: options.maxActionNumber,
      includeLinkCreationFee: options.includeLinkCreationFee,
      skipBalanceCheck: options.skipBalanceCheck,
    });

    // Handle template-based errors
    if (!result.isValid) {
      result.errors.forEach((error) => {
        if (error.metadata && error.message.startsWith("error.")) {
          const message = t(error.message, error.metadata);
          toast.error(message);
        } else {
          toast.error(error.message);
        }
      });
    }

    return result;
  };

  return { validateCustom };
};
```

## Performance Considerations

### Token Lookup Optimization

```typescript
// ❌ Bad: O(n) array search
const token = allAvailableTokens?.find((t) => t.address === asset.tokenAddress);

// ✅ Good: O(1) hash map lookup
const tokenMap = createTokenMap();
const token = tokenMap[asset.tokenAddress];
```

### Validation Caching

```typescript
// ❌ Bad: Multiple validation calls
const validation1 = validateAssets(assets);
const validation2 = validateBalance(assets);
const validation3 = validateFees(assets);

// ✅ Good: Single unified validation
const result = ValidationService.validateAssetsWithFees(
  assets,
  tokenMap,
  options,
);
```

### Error Handling Efficiency

```typescript
// ❌ Bad: Multiple toast calls
errors.forEach((error) => toast.error(error.message));

// ✅ Good: Batch error handling
if (errors.length > 0) {
  showValidationErrorToast(errors);
}
```
