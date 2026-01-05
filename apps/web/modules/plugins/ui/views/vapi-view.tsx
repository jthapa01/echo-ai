"use client";

import { GlobeIcon, PhoneCallIcon, PhoneIcon, WorkflowIcon } from "lucide-react";
import { type Feature, PluginCard } from "../components/plugin-card";
import { useQuery, useAction } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@workspace/ui/components/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage, } from "@workspace/ui/components/form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";


const vapiFeatures: Feature[] = [
    {
        icon: GlobeIcon,
        label: "Web voice calls",
        description: "Make and receive voice calls directly from your web browser.",
    },
    {
        icon: PhoneIcon,
        label: "Phone numbers integration",
        description: "Get dedicated business phone numbers for your organization.",
    },
    {
        icon: PhoneCallIcon,
        label: "Outbound calls",
        description: "Automated customer outbound calls to ensure no call goes unanswered.",
    },
    {
        icon: WorkflowIcon,
        label: "Custom workflows",
        description: "Design and implement custom conversation workflows to suit your business needs.",
    }
];

const formSchema = z.object({
    publicApiKey: z.string().min(1, { message: "Public API Key is required" }),
    privateApiKey: z.string().min(1, { message: "Private API Key is required" }),
});

export const VapiPluginForm = ({
    open,
    setOpen
}: {
    open: boolean;
    setOpen: (value: boolean) => void;
}) => {
    // useAction instead of useMutation because secrets.upsert is now an action
    // This allows us to properly catch Azure Key Vault errors
    const upsertSecret = useAction(api.private.secrets.upsert);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            publicApiKey: "",
            privateApiKey: "",
        },
    })

    const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await upsertSecret({
                service: "vapi",
                value: {
                    publicApiKey: values.publicApiKey,
                    privateApiKey: values.privateApiKey,
                }
            });
            toast.success("Vapi plugin connected successfully!");
            setOpen(false);
        } catch (error) {
            console.error("Error connecting Vapi plugin:", error);
            toast.error("Failed to connect Vapi plugin. Please try again.");
        }
    };

    return (
        <Dialog onOpenChange={setOpen} open={open}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Connect Vapi Plugin</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                    Connect your Vapi account by providing the API keys below.
                    Your API keys are securely stored in Azure Key Vault.
                </DialogDescription>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col gap-y-4">
                        <FormField
                            control={form.control}
                            name="publicApiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Public API Key</Label>
                                    <FormControl>
                                        <Input {...field} placeholder="Your public API key" type="text" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="privateApiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Private API Key</Label>
                                    <FormControl>
                                        <Input {...field} placeholder="Your private API key" type="text" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button
                                disabled={form.formState.isSubmitting}
                                type="submit"
                            >
                                {form.formState.isSubmitting ? "Connecting..." : "Connect Vapi"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
};

export const VapiView = () => {
    const vapiPlugin = useQuery(api.private.plugins.getOne, { service: "vapi" });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [removeOpen, setRemoveOpen] = useState(false);

    const handleConnectClick = () => {
        if(vapiPlugin) {
            setRemoveOpen(true);
        } else {
            setIsDialogOpen(true);
        }
    };

    return (
        <>
            <VapiPluginForm open={isDialogOpen} setOpen={setIsDialogOpen} />
            <div className="flex min-h-screen flex-col bg-muted p-8">
                <div className="mx-auto w-full max-w-screen-md">
                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-4xl">Vapi Plugin</h1>
                        <p className="text-muted-foreground">Integrate Vapi services into your AI voice calls and phone support.</p>
                    </div>
                    <div className="mt-8">
                        {vapiPlugin ? (
                            <p>Vapi plugin is connected.</p>
                        ) : (
                            <PluginCard 
                                serviceImage="/vapi.jpg"
                                serviceName="Vapi"
                                features={vapiFeatures}
                                isDisabled={vapiPlugin === undefined}
                                onSubmit={handleConnectClick}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    )
};

// User enters API keys (from VAPI dashboard)
//         ↓
// Click "Connect"
//         ↓
// Keys stored in Azure Key Vault
//         ↓
// toast.success("Connected!")