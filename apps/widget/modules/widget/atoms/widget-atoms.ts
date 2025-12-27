import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { WidgetScreen } from "@/modules/widget/types";
import { CONTACT_SESSION_KEY } from "../constants";
import { Id } from "@workspace/backend/_generated/dataModel";

// Basic widget state atoms
export const screenAtom = atom<WidgetScreen>("loading");
export const organizationIdAtom = atom<string | null>(null);

// Organization-scoped contact session atom (Map cache instead of deprecated atomFamily)
const contactSessionAtomCache = new Map<
  string,
  ReturnType<typeof atomWithStorage<Id<"contactSessions"> | null>>
>();

export const getContactSessionAtom = (organizationId: string) => {
  if (!contactSessionAtomCache.has(organizationId)) {
    contactSessionAtomCache.set(
      organizationId,
      atomWithStorage<Id<"contactSessions"> | null>(
        `${CONTACT_SESSION_KEY}_${organizationId}`,
        null
      )
    );
  }
  return contactSessionAtomCache.get(organizationId)!;
};

export const errorMessageAtom = atom<string | null>(null);
export const loadingMessageAtom = atom<string | null>(null);
