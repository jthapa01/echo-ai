import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";

type PhoneNumbers = typeof api.private.vapi.getPhoneNumbers._returnType;
type Assistants = typeof api.private.vapi.getAssistants._returnType;

export const useVapiAssistants = (): {
    data: Assistants;
    isLoading: boolean;
    error: Error | null;
} => {
    const [data, setData] = useState<Assistants>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const fetchAssistants = useAction(api.private.vapi.getAssistants);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const result = await fetchAssistants();
                setData(result);
                setError(null);
            } catch(err) {
                setError(err as Error);
                toast.error("Failed to fetch VAPI assistants.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    return { data, isLoading, error };
};

export const useVapiPhoneNumbers = (): {
    data: PhoneNumbers;
    isLoading: boolean;
    error: Error | null;
} => {
    const [data, setData] = useState<PhoneNumbers>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchPhoneNumbers = useAction(api.private.vapi.getPhoneNumbers);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const result = await fetchPhoneNumbers();
                setData(result);
                setError(null);
            } catch(err) {
                setError(err as Error);
                toast.error("Failed to fetch VAPI phone numbers.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    return { data, isLoading, error };
};