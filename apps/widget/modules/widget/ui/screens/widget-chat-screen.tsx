"use client";

import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeftIcon, MenuIcon } from "lucide-react";
import { getContactSessionAtom, conversationIdAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { useAction, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react";
import { Form, FormField } from "@workspace/ui/components/form";
import { AIConversation, AIConversationContent, AIConversationScrollButton } from "@workspace/ui/components/ai/conversation";
import { AIInput, AIInputSubmit, AIInputTextarea, AIInputToolbar, AIInputTools } from "@workspace/ui/components/ai/input";
import { AIMessage, AIMessageContent } from "@workspace/ui/components/ai/message";
import { AIResponse } from "@workspace/ui/components/ai/response";
import { AISuggestion, AISuggestions } from "@workspace/ui/components/ai/suggestion";

const formSchema = z.object({
    message: z.string().min(1, "Message cannot be empty").max(5000, "Message is too long"),
});

export const WidgetChatScreen = () => {
    const setScreen = useSetAtom(screenAtom); // setter fn
    const setConversationId = useSetAtom(conversationIdAtom);

    const conversationId = useAtomValue(conversationIdAtom); // get the value
    const organizationId = useAtomValue(organizationIdAtom);
    const contactSessionId = useAtomValue(getContactSessionAtom(organizationId || ""));

    const conversation = useQuery(api.public.conversations.getOne,
        conversationId && contactSessionId
            ? { conversationId, contactSessionId }
            : "skip"
    );

    const onBack = () => {
        setConversationId(null);
        setScreen("selection");
    };

    // Fetch messages for the conversation's thread
    const messages = useThreadMessages(
        api.public.messages.getMany,
        conversation?.threadId && contactSessionId
            ? 
            {
                threadId: conversation.threadId,
                contactSessionId,
            }
            : "skip",
        { initialNumItems: 10 },
    );

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            message: "",
        },
    });

    // a function that calls messages.create action on the backend.
    // User types message → onSubmit() → createMessage() → Convex action → OpenAI → saves response
    const createMessage = useAction(api.public.messages.create);
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!conversation || !contactSessionId) {
            return;
        }
        form.reset();
        await createMessage({
            threadId: conversation.threadId,
            prompt: values.message,
            contactSessionId,
        });
    };

    return (
        <>
            <WidgetHeader className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                    <Button onClick={onBack} size="icon" variant="transparent">
                        <ArrowLeftIcon />
                    </Button>
                    <p>Chat</p>
                </div>
                <Button size="icon" variant="transparent">
                    <MenuIcon />
                </Button>
            </WidgetHeader>
            <AIConversation>
                <AIConversationContent>
                    {toUIMessages(messages.results ?? [])?.map((message) => {
                        return (
                            <AIMessage from={message.role === "user" ? "user" : "assistant"} key={message.id}>
                                <AIMessageContent>
                                    <AIResponse>{message.content}</AIResponse>
                                </AIMessageContent>
                            </AIMessage>
                        );
                    })}
                </AIConversationContent>
            </AIConversation>
            {/* TODO: Add suggestions */}
            <Form {...form}>
                <AIInput className="rounded-none border-x-0 border-b-0" onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                        control={form.control}
                        name="message"
                        disabled={conversation?.status === "resolved"}
                        render={({ field }) => (
                            <AIInputTextarea
                                disabled={conversation?.status === "resolved"}
                                onChange={field.onChange}
                                onKeyDown={(e) => {
                                    if(e.key === "Enter" && !e.shiftKey){
                                        e.preventDefault();
                                        form.handleSubmit(onSubmit)();
                                    }
                                }}
                                placeholder={conversation?.status === "resolved" ? "This conversation has been resolved." : "Type your message..."}
                                value={field.value}
                            />
                        )}
                    />
                    <AIInputToolbar>
                        <AIInputTools />
                        <AIInputSubmit 
                            disabled={conversation?.status === "resolved" || !form.formState.isValid}
                            status="ready"
                            type="submit"
                         />
                    </AIInputToolbar>
                </AIInput>
            </Form>
        </>
    );
};

