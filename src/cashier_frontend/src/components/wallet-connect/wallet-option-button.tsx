import { FC } from "react";
import CustomConnectedWalletButton from "../use-page/connected-wallet-button";
import WalletButton from "../use-page/connect-wallet-button";
import usePnpStore from "@/stores/plugAndPlayStore";

interface WalletOptionButtonProps {
  walletId: string;
  title: string;
  disabled?: boolean;
  // Callback when clicking on connected wallet button
  onClickConnectedWallet?: () => void;
}

const WalletOptionButton: FC<WalletOptionButtonProps> = ({
  walletId,
  title,
  disabled = false,
  onClickConnectedWallet,
}) => {
  const { account, connect } = usePnpStore();

  // Map walletId to image
  let image = "";
  if (walletId === "iiSigner") {
    image = "/icpLogo.png";
  }
  // Add more walletId-image mappings as needed

  if (account && account.owner) {
    return (
      <CustomConnectedWalletButton
        connectedAccount={account.owner || ""}
        postfixText="Connected"
        postfixIcon={
          image ? (
            <img src={image} alt={title} className="w-6 h-6 mr-2" />
          ) : undefined
        }
        disabled={disabled}
        onClick={() => {
          if (onClickConnectedWallet) {
            onClickConnectedWallet();
          }
        }}
      />
    );
  }

  return (
    <WalletButton
      title={title}
      handleConnect={() => connect(walletId)}
      image={image}
      disabled={disabled}
      postfixText={disabled ? "Coming Soon" : undefined}
    />
  );
};

export default WalletOptionButton;
