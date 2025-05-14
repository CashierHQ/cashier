# Wallet Component Architecture

## Overview

The wallet functionality in this application has been converted to a side-panel-based system where wallet features can be accessed from any page without navigation. This provides a more app-like experience.

## Current Implementation

The wallet functionality exists in two forms:

1. **Panel Components** - Used when wallet features are accessed via the side panel

    - Located in `src/cashier_frontend/src/components/wallet/`
    - Includes panels for wallet, send, receive, details, manage, and import features
    - Managed by the `WalletContext` for state and navigation

2. **Page Components** - Used for direct URL navigation
    - Located in `src/cashier_frontend/src/pages/wallet/`
    - Currently duplicates some of the same functionality as the panel components

## Future Refactoring Recommendations

To reduce code duplication, consider adopting either:

### Option 1: Shared Core Components

Refactor to have shared core components that both panels and pages can use:

```
src/
  cashier_frontend/
    src/
      components/
        wallet/
          core/  # Shared logic used by both panels and pages
            WalletContent.tsx
            SendContent.tsx
            ReceiveContent.tsx
            ManageContent.tsx
          panels/  # Panel-specific wrappers
            WalletPanel.tsx
            SendPanel.tsx
          pages/  # Page-specific wrappers
            WalletPage.tsx
            SendPage.tsx
```

Each panel/page would simply be a wrapper that provides the appropriate layout, navigation handlers, and passes context to the shared core components.

### Option 2: Composition Pattern

Use a composition pattern where the page components actually render the panel components:

```tsx
// WalletPage.tsx
export default function WalletPage() {
    // Set up page-specific navigation handlers
    const handleBack = useCallback(() => {
        navigate("/");
    }, [navigate]);

    return (
        <PageLayout>
            <WalletContent onBack={handleBack} isInPanel={false} />
        </PageLayout>
    );
}

// WalletPanel.tsx
const WalletPanel = ({ onClose }) => {
    // Set up panel-specific navigation
    const handleBack = useCallback(() => {
        onClose();
    }, [onClose]);

    return (
        <PanelLayout onClose={onClose}>
            <WalletContent onBack={handleBack} isInPanel={true} />
        </PanelLayout>
    );
};
```

## Navigation

The `WalletContext` provides navigation utilities for panel-based interactions:

-   `navigateToPanel(panel, params)` - Navigate between panels
-   `openWallet()` - Open the wallet panel
-   `closeWallet()` - Close the wallet panel

For routing-based navigation, continue to use React Router's `useNavigate` hook.
