// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { IdentityKitTransportType, InternetIdentity, NFIDW, Stoic } from "@nfid/identitykit";

// Wallet options enum
export enum WALLET_OPTIONS {
    GOOGLE = "Google login",
    INTERNET_IDENTITY = "Internet Identity",
    OTHER = "Other wallets",
    TYPING = "Typing",
}

// Google signer configuration
export const GoogleSigner = {
    id: "GoogleSigner",
    providerUrl: "https://login.f0i.de/",
    transportType: IdentityKitTransportType.INTERNET_IDENTITY, // InternetIdentity
    label: "Google login",
    icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALlSURBVHgBtVbPSxRRHP++N7Noq7IDaRhFjYRUELSChtChkRK8tUsYSAetox1cT0ES6SE6efAfaJUO/ZLcjqHbjhcRFZwOESHU1CEjoZ10WXXmzbzeU3cd15ndrfQDu/v2+33v8/nO9/ve+w6CIkhHFImsZnochK8goGFmkrmdjQ2KkM6GKgLhTd3UrOrHgfyJs32AnBgFJEFp6IAD0WOTM1pJgXR7tVfqInApwKZ5R7FT5AIvEgiuUZj5+cC6dVr2rFICSSOyraomkkDoxh7B56wJ58O+lUNG7tTMvK5fIA4rbHZeii4CuRXXhZs3JEmdJLwEui/bm6mu/5JnoAlcXNE5Lb9A1Cz9ExAA8VdNCW8dOFaXI8PqfM/DkvQc4WnFpC03PeRjcKqtsPLdK5BIBy+/tb0QSKaDl1kwCHAmFp12PFBVTA91QGL4piAH+KhQUm5+ZMFsPoHP9QY5mVCEK10Z8nHwvbZhk6bZbl819CPJhJLwyrwsOwSiSem+6cI+YXE1kN0TSYfAW0cAKKQDyAfeNNzn6AmSzyhSAq5hgVnkcoQuh2gMA5bW9c+NQTl4/nLrHaa2Ax9RQh4CPlP9XydpXJkhHrhn3WvFIWCEXU4wPMRmmMdJ5fTGtyMC6Wf1zfkDkRmJEsV23Ac9DdNem9J+O4TmhGH0ZXM5ozXdoc4Gc6Z+d7ED8N6ySIet6LRGSYT82l7Me0Bqc/Rbw6O7pE46GXpflIB7B7XBQaejVfro7oIkQx08Vez94pxx+wF8am6sLKOHhSAqnYdkNDMJc11fjvKvRCtvPhND0WUqRsDrqaxbfMui2HCfVKyCU0uP03R0Qk+PQ/MXmF2gRrr1g1PG9k9XEeAWqK5fq8z8/VzkdH/Q9n87RBUtEDCUc7XQMzQzr6eppkd9hXjH5h/DoGsrZob85vqKEXCxZ1vLsXuE7G0QjnwDHn8mZiw2P8OjJVlCYi60XhNJ1kuKmlMxvtGrfXyDI3RJXwL/AHlfXPdns6LXAAAAAElFTkSuQmCC",
};

// Wallet option configurations used in different parts of the app
export const walletDialogConfigOptions = [
    {
        id: "nfid",
        name: "NFID Wallet",
        icon: NFIDW.icon!,
        onClick: () => {}, // This will be set by the component
    },
    {
        id: "stoic",
        name: "Stoic",
        icon: Stoic.icon!,
        onClick: () => {}, // This will be set by the component
    },
    // Uncomment when Plug wallet support is added
];

// Internet Identity wallet option for the header
export const headerWalletOptions = [
    {
        id: "InternetIdentity",
        name: "Internet Identity",
        icon: "/icpLogo.png",
        onClick: () => {}, // This will be set by the component
    },
];

// Function to get wallet icon (string or React component)
export const getWalletIcon = (walletOption: WALLET_OPTIONS): string | React.ReactNode => {
    switch (walletOption) {
        case WALLET_OPTIONS.GOOGLE:
            return "/googleIcon.png";
        case WALLET_OPTIONS.INTERNET_IDENTITY:
            return "/icpLogo.png";
        case WALLET_OPTIONS.OTHER:
            return "";
        default:
            return "";
    }
};

// Default wallet signers
export const defaultSigners = [InternetIdentity];

// All available wallet signers
export const allWalletSigners = [NFIDW, Stoic, GoogleSigner, InternetIdentity];
