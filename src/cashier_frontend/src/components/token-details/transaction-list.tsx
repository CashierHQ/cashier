import { TransactionItemReceive, TransactionItemSend } from "./transaction-item";

export function TransactionList() {
    return (
        <ul className="flex flex-col gap-4 py-4">
            <li>
                <TransactionItemSend />
            </li>

            <li>
                <TransactionItemReceive />
            </li>
        </ul>
    );
}
