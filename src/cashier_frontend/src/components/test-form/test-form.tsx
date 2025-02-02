import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserWalletTestForm } from "./user-wallet-test-form";
import { LinkVaultTestForm } from "./link-vault-test-form";
import { TransferTestForm } from "./transfer-test-form";

interface TestFormProps {
    onCancel?: () => void;
}

export function TestForm(props: TestFormProps) {
    const renderUserWalletTestForm = () => {
        return <UserWalletTestForm onCancel={props.onCancel} />;
    };

    const renderLinkVaultTestForm = () => {
        return <LinkVaultTestForm onCancel={props.onCancel} />;
    };

    return (
        <Tabs defaultValue="userWallet" className="w-[400px]">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="userWallet">User Wallet Test</TabsTrigger>
                <TabsTrigger value="linkVault">Link Vault Test</TabsTrigger>
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
            </TabsList>
            <TabsContent value="userWallet">{renderUserWalletTestForm()}</TabsContent>
            <TabsContent value="linkVault">{renderLinkVaultTestForm()}</TabsContent>
            <TabsContent value="transfer">
                <TransferTestForm onCancel={props.onCancel} />
            </TabsContent>
        </Tabs>
    );
}
