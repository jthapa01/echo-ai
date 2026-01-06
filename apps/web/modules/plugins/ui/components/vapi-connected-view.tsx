"use client";

import { BotIcon, PhoneIcon, SettingsIcon, UnplugIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { VapiAssistantsTab } from "./vapi-assistants-tab";
import { VapiPhoneNumbersTab } from "./vapi-phone-numbers-tab";

interface VapiConnectedViewProps {
    onDisconnect: () => void;
};

export const VapiConnectedView = ({ onDisconnect }: VapiConnectedViewProps) => {
    const [activeTab, setActiveTab] = useState("phone-numbers");

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Image
                                alt="Vapi"
                                className="rounded-lg object-contain"
                                height={48}
                                width={48}
                                src="/vapi.jpg"
                            />
                            <div>
                                <CardTitle>Vapi Integration</CardTitle>
                                <CardDescription>Manage our phone numbers and AI Assistants</CardDescription>
                            </div>
                        </div>
                        <Button onClick={onDisconnect} variant="destructive" size="sm">
                            <UnplugIcon />
                            Disconnect
                        </Button>
                    </div>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex size-12 items-center justify-center rounded-lg border bg-muted">
                                <SettingsIcon className="size-6 text-muted-foreground" />
                            </div>
                            <div>
                                <CardTitle>Widget Configuration</CardTitle>
                                <CardDescription>Set up voice calls for your chat widget</CardDescription>
                            </div>
                        </div>
                        <Button asChild>
                            <Link href="/customization">
                                <SettingsIcon />
                                Configure
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
            </Card>
            <div className="overflow-hidden rounded-lg border bg-background">
                {/* Controlled Tabs: 
                    - value={activeTab} → which tab is currently shown
                    - onValueChange={setActiveTab} → called when user clicks a tab, updates state
                    - When user clicks "AI Assistants", Radix calls setActiveTab("assistants") automatically
                */}
                <Tabs
                    className="gap-0"
                    defaultValue="phone-numbers"
                    onValueChange={setActiveTab}
                    value={activeTab}
                >
                    <TabsList className="grid h-12 w-full grid-cols-2 p-0">
                        <TabsTrigger className="h-full rounded-none" value="phone-numbers">
                            <PhoneIcon />
                            Phone Numbers
                        </TabsTrigger>
                        <TabsTrigger className="h-full rounded-none" value="assistants">
                            <BotIcon />
                            AI Assistants
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="phone-numbers">
                        <VapiPhoneNumbersTab />
                    </TabsContent>
                    <TabsContent value="assistants">
                        <VapiAssistantsTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};