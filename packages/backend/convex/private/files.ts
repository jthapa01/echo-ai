import { ConvexError, v } from "convex/values";
import {
  contentHashFromArrayBuffer,
  guessMimeTypeFromContents,
  guessMimeTypeFromExtension,
  vEntryId,
  Entry,
  EntryId,
} from "@convex-dev/rag";
import { action, mutation, query, QueryCtx } from "../_generated/server";
import { extractTextContent } from "../lib/extractTextContent";
import rag from "../system/ai/rag";
import { Id } from "../_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

function guessMimeType(filename: string, bytes: ArrayBuffer): string {
  return (
    guessMimeTypeFromExtension(filename) ||
    guessMimeTypeFromContents(bytes) ||
    "application/octet-stream"
  );
}

export const deleteFile = mutation({
  args: {
    entryId: vEntryId,
  },
  handler: async (ctx, args) => {
    const getUserIdentity = await ctx.auth.getUserIdentity();
    if (!getUserIdentity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User must be authenticated to delete files.",
      });
    }

    const orgId = getUserIdentity.orgId as string;
    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User must belong to an organization to delete files.",
      });
    }

    const namespace = await rag.getNamespace(ctx, { namespace: orgId });
    if (!namespace) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "RAG namespace not found for organization.",
      });
    }

    const entry = await rag.getEntry(ctx, { entryId: args.entryId });
    if (!entry) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "RAG entry not found.",
      });
    }

    if (entry.metadata?.uploadedBy !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User does not have permission to delete this file.",
      });
    }

    if (entry.metadata?.storageId) {
      // abstraction: convex deletes from storage
      await ctx.storage.delete(entry.metadata.storageId as Id<"_storage">);
    }
    // deletes the chunk entry from RAG vector db
    await rag.deleteAsync(ctx, { entryId: args.entryId });
  },
});

// Action is used for external API call
export const addFile = action({
  args: {
    filename: v.string(),
    mimeType: v.string(),
    bytes: v.bytes(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const getUserIdentity = await ctx.auth.getUserIdentity();
    if (!getUserIdentity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User must be authenticated to upload files.",
      });
    }

    const orgId = getUserIdentity.orgId as string;
    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User must belong to an organization to upload files.",
      });
    }

    const { bytes, filename, category } = args;
    const mimeType = args.mimeType || guessMimeType(filename, bytes);
    const blob = new Blob([bytes], { type: mimeType });
    const storageId = await ctx.storage.store(blob);

    const text = await extractTextContent(ctx, {
      storageId,
      filename,
      bytes,
      mimeType,
    });

    // rag handles embedding internally
    const { entryId, created } = await rag.add(ctx, {
      // Namespace scopes RAG entries to this organization.
      // Search and delete operations are restricted to entries within the same namespace,
      // ensuring tenant isolation (Org A cannot access Org B's documents).
      namespace: orgId,
      text,
      key: filename,
      title: filename,
      metadata: {
        storageId, // important for file deletion
        uploadedBy: orgId, // important for deletion
        filename,
        category: category ?? null,
      } as EntryMetadata,
      contentHash: await contentHashFromArrayBuffer(bytes), // To avoid re-inserting if the file content hasn't changed
    });

    if (!created) {
      // Clean up storage if the entry already existed
      console.debug("entry already exists, skipping upload metadata");
      await ctx.storage.delete(storageId);
    }

    return {
      url: await ctx.storage.getUrl(storageId),
      entryId,
    };
  },
});

export const list = query({
  args: {
    category: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const getUserIdentity = await ctx.auth.getUserIdentity();
    if (!getUserIdentity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User must be authenticated to list files.",
      });
    }

    const orgId = getUserIdentity.orgId as string;
    if (!orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User must belong to an organization to list files.",
      });
    }

    const namespace = await rag.getNamespace(ctx, { namespace: orgId });
    if (!namespace) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const results = await rag.list(ctx, {
      namespaceId: namespace.namespaceId,
      paginationOpts: args.paginationOpts,
    });

    // Convert all entries to PublicFile in parallel (faster than sequential awaits)
    const files = await Promise.all(
      results.page.map((entry) => convertEntryToPublicFile(ctx, entry))
    );
    const filteredFiles = args.category
      ? files.filter((file) => file.category === args.category)
      : files;

    return {
      page: filteredFiles,
      isDone: results.isDone,
      continueCursor: results.continueCursor,
    };
  },
});

type EntryMetadata = {
  storageId: Id<"_storage">;
  uploadedBy: string;
  filename: string;
  category: string | null;
};

export type PublicFile = {
  id: EntryId;
  name: string;
  type: string;
  size: string;
  status: "ready" | "processing" | "error";
  url: string | null;
  category?: string;
};

async function convertEntryToPublicFile(
  ctx: QueryCtx,
  entry: Entry
): Promise<PublicFile> {
  const metadata = entry.metadata as EntryMetadata | undefined;
  const storageId = metadata?.storageId;

  let fileSize = "unknown";
  if (storageId) {
    try {
      const storageMetadata = await ctx.db.system.get(storageId);
      if (storageMetadata) {
        fileSize = formatFileSize(storageMetadata.size);
      }
    } catch (error) {
      console.error("Error fetching storage metadata:", error);
    }
  }

  const filename = entry.key || "unknown";
  const extension = filename.split(".").pop()?.toLowerCase() || "txt";

  let status: "ready" | "processing" | "error" = "error";
  if (entry.status === "ready") {
    status = "ready";
  } else if (entry.status === "pending") {
    status = "processing";
  }

  const url = storageId ? await ctx.storage.getUrl(storageId) : null;
  return {
    id: entry.entryId,
    name: filename,
    type: extension,
    size: fileSize,
    status,
    url,
    category: metadata?.category || undefined,
  };
}

/**
 * Converts bytes to human-readable format (e.g., 1536 → "1.5 KB")
 * Uses log base 1024 to find the appropriate unit index:
 *   i=0 → Bytes, i=1 → KB, i=2 → MB, etc.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

// Example RAG entry structure:
// entry = {
//   _id: "rag_entry_abc123",           // The entry ID
//   text: "This is the chunk text...", // The stored text content
//   namespace: "org_12345",             // Which organization it belongs to
//   embedding: [0.12, -0.05, ...],      // The 1536-number vector (optional)
//   metadata: {                         // Custom data you stored with it
//     filename: "manual.pdf",
//     fileId: "storage_xyz789",
//     chunkIndex: 3,
//     storageId: args.storageId,  // ← Store the storage ID
//     uploadedBy: userId,
//   },
//   hash: "sha256_abc...",              // Content hash for deduplication
//   createdAt: 1735600000000,           // When it was created
// }
