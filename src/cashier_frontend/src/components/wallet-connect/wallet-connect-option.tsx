import { FC } from "react";
import WalletButton from "../use-page/connect-wallet-button";
import usePnpStore from "@/stores/plugAndPlayStore";

interface WalletOptionOptionProps {
  walletId: string;
  title: string;
  disabled?: boolean;
  // Callback after successful login
  onLoginSuccess?: () => void;
}

const WalletConnectOptionButton: FC<WalletOptionOptionProps> = ({
  walletId,
  title,
  disabled = false,
  onLoginSuccess,
}) => {
  const { connect } = usePnpStore();
  const { pnp } = usePnpStore();

  const config: // partial infer config adapter
  | {
        id: string;
        enabled: boolean;
        logo: string;
      }
    | undefined = pnp?.config.adapters[walletId];

  if (!config) {
    return null;
  }

  // Map walletId to image
  let image = config.logo;
  if (walletId === "iiSigner") {
    image = "/icpLogo.png";
  }

  return (
    <WalletButton
      title={title}
      handleConnect={async () => {
        await connect(walletId);
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }}
      image={image}
      disabled={disabled}
      postfixText={disabled ? "Coming Soon" : undefined}
    />
  );
};

export default WalletConnectOptionButton;
