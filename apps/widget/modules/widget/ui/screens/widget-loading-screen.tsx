"use client";

import { useEffect, useState } from "react";
import { LoaderIcon } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { errorMessageAtom, screenAtom, loadingMessageAtom, organizationIdAtom, getContactSessionAtom } from "@/modules/widget/atoms/widget-atoms";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { useAction, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

type InitStep = "org" | "session" | "settings" | "vapi" | "done";

export const WidgetLoadingScreen = ({ organizationId }: { organizationId: string | null }) => {
    const [step, setStep] = useState<InitStep>("org");
    const [sessionValid, setSessionValid] = useState(false);

    const setScreen = useSetAtom(screenAtom);
    const setErrorMessage = useSetAtom(errorMessageAtom);
    const setLoadingMessage = useSetAtom(loadingMessageAtom);
    const setOrganizationId = useSetAtom(organizationIdAtom); // setter function
    const loadingMessage = useAtomValue(loadingMessageAtom);

    const contactSessionId = useAtomValue(getContactSessionAtom(organizationId || ""));

    // 1. useAction gives you a callable function
    const validateOrganization = useAction(api.public.organizations.validate);

    useEffect(() => {
        if(step !== "org") return;
        setLoadingMessage("Finding organization ID...");

        if(!organizationId) {
            setErrorMessage("Organization ID is missing");
            setScreen("error");
            return;
        }
        setLoadingMessage("Verifying organization...");

        // 2. Call it with args to get the result
        validateOrganization({ organizationId })
            // 3. Check the result
            .then((result) => {
                if (result.valid) {
                    setOrganizationId(organizationId); // set the organizationId in atom
                    setStep("session");
                } else {
                    setErrorMessage(result.reason || "Organization validation failed");
                    setScreen("error");
                }
            })
            .catch((error) => {
                setErrorMessage("Error validating organization: " + error.message);
                setScreen("error");
            });
    }, [organizationId, step, setErrorMessage, setLoadingMessage, setOrganizationId, setScreen, validateOrganization, setStep]);

    // Step 2: Validate or create contact session
    const validateContactSession = useMutation(api.public.contactSessions.validate);
    useEffect(() => {
        if(step !== "session") return;
        setLoadingMessage("Finding contact session ID...");

        if(!contactSessionId) {
            setSessionValid(false);
            setStep("done");
            return;
        }

        setLoadingMessage("Validating session...");

        validateContactSession({ contactSessionId })
            .then((result) => {
                setSessionValid(result.valid);
                setStep("done");
            })
            .catch(() => {
                setSessionValid(false);
                setStep("done");
            })
    }, [contactSessionId, step, setLoadingMessage, validateContactSession]);

    useEffect(() => {
        if(step !== "done") return;
        const hasValidSession = contactSessionId && sessionValid;
        setScreen(hasValidSession ? "selection" : "auth");
    }, [step, contactSessionId, sessionValid, setScreen]);

    return (
        <>
            <WidgetHeader>
                <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semibold">
                    <p className="text-3xl">Hi there! 👋</p>
                    <p className="text-lg">Let&apos;s get you started </p>
                </div>
            </WidgetHeader>
            <div className="flex flex-1 flex-col items-center justify-center gap-y-4 p-4 text-muted-foreground">
                <LoaderIcon className="animate-spin" />
                {loadingMessage || "loading..."}
            </div>

        </>
    )
};