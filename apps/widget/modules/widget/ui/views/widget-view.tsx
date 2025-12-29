"use client"

import { useAtomValue } from "jotai";
import { WidgetAuthScreen } from "@/modules/widget/ui/screens/widget-auth-screen";
import { screenAtom } from "@/modules/widget/atoms/widget-atoms";
import { WidgetErrorScreen } from "@/modules/widget/ui/screens/widget-error-screen";
import { WidgetLoadingScreen } from "@/modules/widget/ui/screens/widget-loading-screen";
import { WidgetSelectionScreen } from "@/modules/widget/ui/screens/widget-selection-screen";
import { WidgetChatScreen } from "@/modules/widget/ui/screens/widget-chat-screen";
import { WidgetInboxScreen } from "../screens/widget-inbox-screen";

interface WidgetViewProps {
    organizationId: string | null;
};

export const WidgetView = ({ organizationId }: WidgetViewProps) => {
    // read current value from atom e.g. "loading", "chat", "inbox"
    // Any screen can call setScreen to navigate to a different screen
    // WidgetView re-renders → shows <WidgetAuthScreen /> etc based on current screen value
    const screen = useAtomValue(screenAtom);
    const screenComponents = {
        error: <WidgetErrorScreen />,
        loading: <WidgetLoadingScreen organizationId={organizationId} />,
        auth: <WidgetAuthScreen />,
        voice: <p>TODO: Voice</p>,
        contact: <p>TODO: Contact</p>,
        selection: <WidgetSelectionScreen />,
        inbox: <WidgetInboxScreen />,
        chat: <WidgetChatScreen />,
    }
    return (
        // TODO: Confirm whether or not "min-h-screen" and "min-w-screen" is needed
        <main className="min-h-screen min-w-screen flex h-full w-full flex-col overflow-hidden rounded-xl border bg-muted">
            {screenComponents[screen]}
        </main>
    )
};