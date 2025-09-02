import React from "react";
import CustomConnectedWalletButton from "../use-page/connected-wallet-button";
import WalletButton from "../use-page/connect-wallet-button";
import { WALLET_OPTIONS, getWalletIcon } from "@/constants/wallet-options";
import { Identity } from "@dfinity/agent";
import { useIdentity, useSigner } from "@nfid/identitykit/react";

interface WalletOptionButtonProps {
  walletOption: WALLET_OPTIONS;
  title: string;
  iconOrImage?: string | JSX.Element;
  disabled?: boolean;
  identity?: Identity;
  handleConnect: (walletOption: WALLET_OPTIONS) => void;
}

const WalletOptionButton: React.FC<WalletOptionButtonProps> = ({
  walletOption,
  title,
  iconOrImage,
  disabled = false,
  handleConnect,
}) => {
  const signer = useSigner();
  const identity = useIdentity();
  const finalIconOrImage = iconOrImage || getWalletIcon(walletOption);

  if (signer?.id) {
    return (
      <CustomConnectedWalletButton
        connectedAccount={identity?.getPrincipal().toString()}
        postfixText="Connected"
        postfixIcon={
          typeof finalIconOrImage === "string" ? (
            <img src={finalIconOrImage} alt={title} className="w-6 h-6 mr-2" />
          ) : null
        }
        handleConnect={() => handleConnect(walletOption)}
        disabled={disabled}
      />
    );
  }

  return (
    <WalletButton
      title={title}
      handleConnect={() => handleConnect(walletOption)}
      image={
        typeof finalIconOrImage === "string" ? finalIconOrImage : undefined
      }
      icon={typeof finalIconOrImage !== "string" ? finalIconOrImage : undefined}
      disabled={disabled}
      postfixText={disabled ? "Coming Soon" : undefined}
    />
  );
};

export default WalletOptionButton;
