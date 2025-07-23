# Cashier Frontend Documentation

## 🚀 Getting Started

### Prerequisites

-   Node.js (v16 or higher)
-   npm or yarn
-   [Internet Computer Development Environment (DFX)](https://internetcomputer.org/docs/building-apps/getting-started/install)

### Installation and Running the Project

1. Clone the repository

2. Install dependencies:

    ```bash
    npm install
    ```

3. Generate declarations folders:

    ```bash
    make generate
    ```

    This step is crucial as it generates the necessary declaration files in the local environment before running the application.

4. Start the application:
    ```bash
    npm start
    ```

## 🏗️ Architecture

The application follows a modern React architecture with the following key elements:

1. **Component-Based Structure**: UI elements are organized into reusable components with shadcn/ui design system
2. **Identity Management**: NFID IdentityKit for wallet connections and authentication
3. **Custom Hooks**: Encapsulate common logic and state management
4. **Services**: Handle API interactions with the backend canisters
5. **Zustand Stores**: Provide global state management
6. **React Router**: Hash-based routing for seamless navigation
7. **Context Providers**: Manage global state and user sessions

## 🛠️ Core Technologies

-   **React 18**: UI library with modern features
-   **TypeScript**: Static typing for better development experience
-   **Vite**: Fast build tool and development server
-   **Tailwind CSS**: Utility-first CSS framework
-   **shadcn/ui**: Modern React component library built on Radix UI
-   **React Router**: Hash-based routing library
-   **Zustand**: Lightweight state management
-   **TanStack Query**: Data fetching and caching
-   **React Hook Form**: Form management with validation
-   **Zod**: Schema validation
-   **i18next**: Internationalization
-   **NFID IdentityKit**: Internet Identity and wallet integration
-   **Framer Motion**: Animation library
-   **Internet Computer SDK**: Interaction with the IC blockchain

## 📁 Project Structure

### `/src/components`

Contains all reusable UI components organized by feature:

-   **UI Components**: shadcn/ui based components (`/ui/`)
-   **Wallet Components**: Wallet connection and management (`/wallet/`)
-   **Link Components**: Link creation, editing, and display (`/link-*/`)
-   **Form Components**: Multi-step forms and input components
-   **Asset Components**: Token and asset management components
-   **Layout Components**: Headers, sidebars, and page layouts

### `/src/contexts`

React context providers for global state:

-   `IdleTimeoutProvider.tsx`: Manages user session timeouts
-   `image-cache-context.tsx`: Caches images for performance
-   `multistep-form-context.tsx`: Manages multi-step form state
-   `wallet-context.tsx`: Manages wallet connection state

### `/src/hooks`

Custom React hooks organized by functionality:

-   **Core Hooks**: `responsive-hook.ts`, `useDialog.ts`
-   **Token Hooks**: `token-hooks.ts`, `useTokens.ts`, `useTokenMetadataWorker.ts`
-   **Link Hooks**: `link-hooks.ts`, `useLinkMutations.ts`, `useLinkFormInitialization.ts`
-   **Action Hooks**: `action-hooks.ts`, `use-icrc-112-execute.ts`
-   **Fee Hooks**: `useFeeService.ts`, `useFeeMetadata.ts`
-   **Navigation**: `useLinkNavigation.ts`
-   **Specialized Directories**: `/api/`, `/form/`, `/polling/`, `/stores/`

### `/src/pages`

Page components organized by route structure:

-   `index.tsx`: Home page - link creation and management
-   `/[id]/`: Dynamic link pages
    -   `index.tsx`: Claim page for link users
    -   `choose-wallet.tsx`: Wallet selection page
    -   `complete.tsx`: Transaction completion page
-   `/details/[id]/`: Link details and analytics
-   `/edit/[id]/`: Link editing interface

### `/src/services`

Backend service integrations and utilities:

-   **Core Services**:
    -   `fee.service.ts`: Fee calculation and management
    -   `tokenUtils.service.ts`: Token metadata and utilities
    -   `validation.service.ts`: Form and data validation
    -   `error-handler.service.ts`: Comprehensive error handling
-   **External Services**:
    -   `icExplorer.service.ts`: IC Explorer integration
    -   `/usdConversionService/`: USD price conversion
    -   `/price/`: Token price services
-   **Backend Integration**:
    -   `/backend/`: Canister communication
    -   `/signerService/`: Wallet signing services
    -   `/transactionHistoryService/`: Transaction tracking
-   **Utilities**:
    -   `/parser/`: Data parsing utilities
    -   `/navigation/`: Navigation helpers

### `/src/stores`

Zustand stores for global state management:

-   `linkActionStore.ts`: Link creation and action state
-   `linkCreationFormStore.ts`: Form state for link creation
-   `tokenStore.ts`: Token metadata and balance management
-   `signerStore.ts`: Wallet signer configuration
-   `sendAssetStore.ts`: Asset transfer state
-   `buttonStateStore.ts`: UI button states
-   `index.ts`: Store reset functionality

### `/src/types`

TypeScript type definitions:

-   `error.enum.ts`: Error type enumerations
-   `fungible-token.speculative.ts`: Token type definitions
-   `price.service.type.ts`: Price service types

### `/src/utils`

Utility functions and helpers:

-   `link-type.utils.ts`: Link type utilities
-   `linkDefaults.ts`: Default link configurations
-   `/helpers/`: Various helper functions
-   `/map/`: Data mapping utilities

### `/src/constants`

Application constants and configuration:

-   `base64Images.ts`: Embedded image data
-   `defaultValues.ts`: Default form values
-   `linkTemplates.ts`: Link template definitions

## 🔧 Available Scripts

```bash
# Development
npm start              # Start development server on port 3000
npm run build          # Build for production
npm run build:local    # Build for local environment
npm run build:dev      # Build for dev environment
npm run build:staging  # Build for staging environment
npm run build:prod     # Build for production environment

# Code Quality
npm run format         # Format code with Prettier
npm run lint           # Run ESLint
npm test              # Run Jest tests

# Utilities
npm run clean          # Clean build directory
npm run setup          # Initial project setup
```

## 🎯 Key Features

### Multi-Step Link Creation

-   Template-based link creation with guided forms
-   Asset selection and configuration
-   Real-time fee calculation
-   Link preview and sharing

### Wallet Integration

-   NFID IdentityKit integration
-   Multiple wallet support (Plug, Stoic, etc.)
-   Internet Identity authentication
-   Automatic wallet detection

### Token Management

-   ICRC token support
-   Token metadata caching with Web Workers
-   Balance tracking and updates
-   Custom token import functionality

### Transaction Flow

-   ICRC-112 batch transaction support
-   Real-time transaction status
-   Comprehensive error handling
-   Transaction history tracking

### Responsive Design

-   Mobile-first approach
-   Adaptive layouts for different screen sizes
-   Touch-friendly interfaces
-   Progressive Web App features

## 🚀 Common Development Tasks

### Adding a New Page

1. Create a new component in `/src/pages/`
2. Add the route to `/src/Router.tsx`
3. Implement authentication if needed with `RequireAuth`

### Creating a New Component

1. Create component in appropriate `/src/components/` subdirectory
2. Follow shadcn/ui patterns for consistency
3. Add TypeScript interfaces for props
4. Export from index files if needed

### Adding a New Service

1. Create service file in `/src/services/`
2. Define service class with proper error handling
3. Add TypeScript interfaces in `/src/types/`
4. Integrate with TanStack Query for data fetching

### Adding a New Store

1. Create store file in `/src/stores/`
2. Define store using Zustand patterns
3. Add store to reset function in `/src/stores/index.ts`
4. Add TypeScript interfaces for store state

### Working with Forms

1. Use React Hook Form with Zod validation
2. Leverage the multi-step form context for complex flows
3. Implement proper error handling and user feedback
4. Follow established patterns in existing forms

## 🔍 Development Guidelines

### Code Organization

-   Group related functionality together
-   Use TypeScript interfaces for all data structures
-   Follow consistent naming conventions
-   Implement proper error boundaries

### State Management

-   Use Zustand for global state
-   Prefer local state for component-specific data
-   Implement proper cleanup in useEffect hooks
-   Use TanStack Query for server state

### Styling

-   Use Tailwind CSS utility classes
-   Follow shadcn/ui component patterns
-   Implement responsive design principles
-   Use CSS variables for theming

### Performance

-   Implement proper memoization with React.memo
-   Use Web Workers for heavy computations
-   Optimize images and assets
-   Implement proper loading states

## 📚 Resources

-   **Internet Computer**: [Documentation](https://internetcomputer.org/docs/current/developer-docs/)
-   **React**: [Documentation](https://react.dev/)
-   **TypeScript**: [Documentation](https://www.typescriptlang.org/docs/)
-   **Vite**: [Documentation](https://vitejs.dev/)
-   **Tailwind CSS**: [Documentation](https://tailwindcss.com/docs)
-   **shadcn/ui**: [Documentation](https://ui.shadcn.com/)
-   **Zustand**: [Documentation](https://github.com/pmndrs/zustand)
-   **TanStack Query**: [Documentation](https://tanstack.com/query/latest)
-   **React Hook Form**: [Documentation](https://react-hook-form.com/)
-   **NFID IdentityKit**: [Documentation](https://identitykit.xyz/)
-   **ICRC Standards**: [ICRC-1](https://github.com/dfinity/ICRC-1), [ICRC-112](https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_112_batch_call_canister.md)

---

**Last Updated:** December 2024  
**Version:** 0.0.9
