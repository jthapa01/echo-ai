import { UseFormReturn } from "react-hook-form";
import { useVapiAssistants, useVapiPhoneNumbers } from "@/modules/plugins/hooks/use-vapi-data";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { FormSchema } from "../../types.js";

interface VapiFormFieldProps {
    form: UseFormReturn<FormSchema>; // type of return value of useForm with FormSchema
};

export const VapiFormFields = ({ form }: VapiFormFieldProps) => {
    const { data: assistants, isLoading: isLoadingAssistants } = useVapiAssistants();
    const { data: phoneNumbers, isLoading: isLoadingPhoneNumbers } = useVapiPhoneNumbers();

    const disabled = form.formState.isSubmitting;

    return (
        <>
            <FormField
                control={form.control}
                name="vapiSettings.assistantId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Voice Assistant</FormLabel>
                        <Select
                            disabled={isLoadingAssistants || disabled}
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingAssistants ? "Loading assistants..." : "Select a voice assistant"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {assistants?.map((assistant) => (
                                    <SelectItem key={assistant.id} value={assistant.id}>
                                        {assistant.name || "Unnamed Assistant"} -{" "} {assistant.model?.model || "No model configured"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            Choose the voice assistant to handle calls.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="vapiSettings.phoneNumber"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <Select
                            disabled={isLoadingPhoneNumbers || disabled}
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingPhoneNumbers ? "Loading phone numbers..." : "Select a phone number"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {phoneNumbers?.map((phoneNumber) => (
                                    <SelectItem key={phoneNumber.id} value={phoneNumber.number || phoneNumber.id}>
                                        {phoneNumber.number || "Unknown"} -{" "}{phoneNumber.name || "Unnamed"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            Choose the phone number to be used.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    )
};