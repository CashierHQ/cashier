# ConfirmationDrawerV2 Component

## Overview

The `ConfirmationDrawerV2` is an enhanced confirmation drawer component that handles transaction confirmations across different action types (USE_LINK, WITHDRAW_LINK, CREATE_LINK). It provides a unified interface for displaying action details, handling transactions, and managing button states throughout the transaction lifecycle.

## Key Features

-   **Unified Interface**: Works with all three confirmation hooks (`useUseConfirmation`, `useWithdrawConfirmation`, `useCreateConfirmation`)
-   **Smart Button Management**: Automatically manages button text and disabled states based on action state
-   **Auto-Continue**: 5-second countdown timer for successful transactions
-   **Error Handling**: Retry functionality for failed transactions
-   **Loading States**: Skeleton loading when action data is not available

## Button State Management

The confirmation drawer manages button states intelligently based on various conditions. Here's the complete breakdown:

### Button Disabled States Table

| Scenario                   | Button Text                          | Disabled   | Duration          | Trigger                      | Reason                               |
| -------------------------- | ------------------------------------ | ---------- | ----------------- | ---------------------------- | ------------------------------------ |
| **Initial Load**           | `""` (empty) → "Confirm Transaction" | ✅ `true`  | 0.5s              | Drawer opens                 | Prevent accidental immediate clicks  |
| **Normal State**           | "Confirm Transaction"                | ❌ `false` | Until action      | Ready state                  | Ready for user interaction           |
| **Processing**             | "Processing..."                      | ✅ `true`  | Until complete    | User clicks confirm          | Transaction in progress              |
| **Success (5-2s)**         | "Continue in 5s" → "Continue in 2s"  | ❌ `false` | 4 seconds         | Transaction succeeds         | User can manually continue           |
| **Success (1s)**           | "Continue in 1s"                     | ✅ `true`  | 1 second          | Countdown = 1                | About to auto-trigger, prevent click |
| **Auto-continue**          | "Processing..."                      | ✅ `true`  | Until complete    | Timer hits 0                 | Auto-continue executing              |
| **Manual Continue**        | "Processing..."                      | ✅ `true`  | Until complete    | User clicks during countdown | Manual continue executing            |
| **Failed Transaction**     | "Retry"                              | ❌ `false` | Until retry       | Transaction fails            | User can retry transaction           |
| **After Continue Success** | "Confirm Transaction"                | ❌ `false` | Until next action | Continue completes           | Reset for potential next actions     |
| **Error State**            | "Confirm Transaction"                | ❌ `false` | Until recovery    | Error occurs                 | Reset after error handling           |

### Critical Button State Rules

1. **Always disabled during processing**: Prevents double-submission
2. **Disabled at countdown = 1s**: Prevents race condition between manual and auto-trigger
3. **Reset after errors**: Always returns to enabled state for recovery
4. **Initial 0.5s guard**: Prevents accidental clicks during drawer animation

### Action State Mapping

| Action State | Button Behavior                  | Description                     |
| ------------ | -------------------------------- | ------------------------------- |
| `undefined`  | Disabled (0.5s) → Enabled        | Initial state when drawer opens |
| `CREATED`    | "Confirm Transaction" (Enabled)  | Ready to start transaction      |
| `PROCESSING` | "Processing..." (Disabled)       | Transaction in progress         |
| `SUCCESS`    | "Continue in Xs" → Auto-continue | Success with countdown          |
| `FAIL`       | "Retry" (Enabled)                | Allow user to retry             |

### Special Conditions

#### 1. Initial Drawer Open

```typescript
// 0.5s delay when drawer opens
useEffect(() => {
    if (open) {
        setButton((prev) => ({ ...prev, disabled: true }));
        setTimeout(() => {
            setButton((prev) => ({ ...prev, disabled: false }));
        }, 500);
    }
}, [open]);
```

#### 2. Success State Countdown

```typescript
// 5-second countdown starts on SUCCESS
if (action?.state === ACTION_STATE.SUCCESS && open) {
    setCountdown(5); // Starts 5-second timer
}

// Button states during countdown:
// 5s-2s: "Continue in Xs" (Enabled - user can click)
// 1s: "Continue in 1s" (Disabled - about to auto-trigger)
// 0s: Auto-triggers onSuccessContinue()
```

#### 3. Prevent Multiple Triggers

```typescript
// Prevents multiple continue calls
if (hasClickedOnSuccessContinue) return;

// Set flag when user manually clicks in SUCCESS state
if (action?.state === ACTION_STATE.SUCCESS) {
    setHasClickedOnSuccessContinue(true);
}
```

## Props Interface

```typescript
interface ConfirmationDrawerV2Props {
    link: LinkDetailModel;
    action?: ActionModel;
    open: boolean;
    onClose?: () => void;
    onInfoClick?: () => void;
    onActionResult?: (action: ActionModel) => void;
    onCashierError?: (error: Error) => void;
    handleConfirmTransaction: () => Promise<void>;
    handleSuccessContinue?: () => Promise<void>;
    maxActionNumber?: number;
}
```

## Usage with Confirmation Hooks

### With useUseConfirmation (USE_LINK)

```typescript
const { handleSuccessContinue, handleConfirmTransaction, onActionResult, onCashierError } =
    useUseConfirmation({...});

<ConfirmationDrawerV2
    open={showConfirmation}
    link={link}
    action={internalAction}
    onClose={() => setShowConfirmation(false)}
    onActionResult={onActionResult}
    onCashierError={onCashierError}
    handleSuccessContinue={handleSuccessContinue}
    handleConfirmTransaction={handleConfirmTransaction}
/>
```

### With useWithdrawConfirmation (WITHDRAW_LINK)

```typescript
const { handleSuccessContinue, handleConfirmTransaction, onActionResult, onCashierError } =
    useWithdrawConfirmation({...});

<ConfirmationDrawerV2
    open={showConfirmationDrawer}
    link={link}
    action={currentAction}
    onClose={() => setShowConfirmationDrawer(false)}
    onActionResult={onActionResult}
    onCashierError={onCashierError}
    handleSuccessContinue={handleSuccessContinue}
    handleConfirmTransaction={handleConfirmTransaction}
/>
```

### With useCreateConfirmation (CREATE_LINK)

```typescript
const { handleSuccessContinue, handleConfirmTransaction } =
    useCreateConfirmation({...});

<ConfirmationDrawerV2
    open={showConfirmation}
    link={link}
    action={currentAction}
    onClose={() => setShowConfirmation(false)}
    onActionResult={onActionResult}
    onCashierError={onCashierError}
    handleSuccessContinue={handleSuccessContinue}
    handleConfirmTransaction={handleConfirmTransaction}
/>
```

## Button State Flow Diagram

```
┌─────────────────┐
│   Drawer Opens  │
│   (0.5s delay)  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ "Confirm Trans" │
│   (Enabled)     │
└─────────┬───────┘
          │ User clicks
          ▼
┌─────────────────┐
│ "Processing..." │
│   (Disabled)    │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌─────────┐ ┌─────────┐
│SUCCESS  │ │  FAIL   │
└─────────┘ └─────────┘
    │           │
    ▼           ▼
┌─────────┐ ┌─────────┐
│Countdown│ │ "Retry" │
│ 5s→1s   │ │(Enabled)│
└─────────┘ └─────────┘
    │
    ▼
┌─────────────────┐
│ Auto-continue   │
│ "Processing..." │
│   (Disabled)    │
└─────────────────┘
```

## Error Handling

The drawer handles errors gracefully:

1. **Transaction Errors**: Caught in `onClickSubmit()` and passed to `onCashierError`
2. **State Reset**: Button returns to enabled state after error handling
3. **Retry Capability**: Failed actions show "Retry" button for user to try again

## Performance Considerations

-   **Memoization**: Consider memoizing the component if re-renders are frequent
-   **Cleanup**: All timers are properly cleaned up to prevent memory leaks
-   **State Management**: Internal state is minimal and focused on UI concerns

## Testing Scenarios

Key scenarios to test:

1. ✅ Initial drawer open (0.5s delay)
2. ✅ Normal transaction flow
3. ✅ Success countdown (5s → auto-continue)
4. ✅ Manual continue during countdown
5. ✅ Failed transaction retry
6. ✅ Multiple rapid clicks prevention
7. ✅ Drawer close during countdown
8. ✅ Error handling and recovery
