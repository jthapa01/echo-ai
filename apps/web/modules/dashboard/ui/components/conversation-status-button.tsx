import { Hint } from "@workspace/ui/components/hint";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { ArrowRightIcon, ArrowUpIcon, CheckIcon } from "lucide-react";

export const ConversationStatusButton = ({ status, onClick, disabled, }: { status: Doc<"conversations">["status"]; onClick: () => void; disabled?: boolean; }) => {
    // Button shows the ACTION (what clicking will do)

    if (status === "unresolved") {
        // Clicking will escalate
        return (
            <Hint text="Escalate to human operator">
                <Button onClick={onClick} disabled={disabled} variant="warning" size="sm">
                    <ArrowUpIcon />
                    Escalate
                </Button>
            </Hint>
        );
    }

    if (status === "escalated") {
        // Clicking will resolve
        return (
            <Hint text="Mark as resolved">
                <Button onClick={onClick} disabled={disabled} variant="tertiary" size="sm">
                    <CheckIcon />
                    Resolve
                </Button>
            </Hint>
        );
    }

    // status === "resolved"
    // Clicking will reopen (set to unresolved)
    return (
        <Hint text="Reopen conversation">
            <Button onClick={onClick} disabled={disabled} variant="destructive" size="sm">
                <ArrowRightIcon />
                Reopen
            </Button>
        </Hint>
    );
}