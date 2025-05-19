import AppRouter from "./Router";
import { IdentityKitProvider } from "@nfid/identitykit/react";
import "@nfid/identitykit/react/styles.css";
import "./locales/config";
import "./index.css";
import { IdentityKitAuthType } from "@nfid/identitykit";
import { Toaster } from "./components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSignerStore } from "./stores/signerStore";
import { ContainerScroll } from "./components/ui/container-scroll-animation";

const targets = ["jjio5-5aaaa-aaaam-adhaq-cai"];

console.log("ENV", import.meta.env.VITE_IC_EXPLORER_BASE_URL);
console.log(import.meta.env.MODE);
console.log(import.meta.env.VITE_BACKEND_CANISTER_ID);
console.log(import.meta.env.VITE_TOKEN_STORAGE_CANISTER_ID);

function App() {
    const queryClient = new QueryClient();
    const { signers } = useSignerStore();

    return (
        <IdentityKitProvider
            featuredSigner={false}
            onConnectFailure={(e: Error) => {
                console.log("Connect to Identity fail: " + e);
            }}
            onConnectSuccess={() => {}}
            onDisconnect={() => {
                queryClient.clear();
            }}
            authType={IdentityKitAuthType.DELEGATION}
            signers={signers}
            signerClientOptions={{
                targets,
                maxTimeToLive: 3_600_000_000_000n,
            }}
            discoverExtensionSigners={true}
        >
            <QueryClientProvider client={queryClient}>
                <AppRouter />
                <Toaster />
            </QueryClientProvider>
        </IdentityKitProvider>
    );
}

// TODO: remove this after release
function App1() {
    return (
        <div>
            <ContainerScroll
                titleComponent={
                    <>
                        <h1 className="text-4xl font-semibold text-black dark:text-white">
                            We're developing
                            <br />
                            <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-green">
                                CashierApp
                            </span>
                        </h1>
                    </>
                }
            >
                {/* Social Media Links */}
                <div className="flex justify-center gap-2 sm:gap-4 mb-12">
                    <a
                        href="https://x.com/thecashierapp"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 sm:px-6 sm:py-3 bg-blue-400 hover:bg-blue-500 text-white font-medium rounded-lg flex items-center gap-1 sm:gap-2 transition-colors duration-300 text-xs sm:text-base"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            className="sm:w-5 sm:h-5"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                        >
                            <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z" />
                        </svg>
                        Follow on Twitter
                    </a>
                    <a
                        href="https://discord.gg/GmT54Tsw"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 sm:px-6 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center gap-1 sm:gap-2 transition-colors duration-300 text-xs sm:text-base"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            className="sm:w-5 sm:h-5"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                        >
                            <path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z" />
                        </svg>
                        Join Discord
                    </a>
                </div>
                <img src="/preview.png" alt="CashierApp Preview" />
            </ContainerScroll>
        </div>
    );
}

export default App;
