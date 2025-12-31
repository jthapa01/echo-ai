import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { StorageActionWriter } from "convex/server";
import { assert } from "convex-helpers";
import { Id } from "../_generated/dataModel";

const AI_MODELS = {
  image: openai.chat("gpt-4o-mini"),
  pdf: openai.chat("gpt-4o"),
  html: openai.chat("gpt-4o"),
  text: openai.chat("gpt-4o"),
} as const;

const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

const SYSTEM_PROMPTS = {
  image: `You are an expert at extracting text content from images.

**For documents, receipts, forms, or screenshots of text:**
- Transcribe all visible text exactly as shown
- Preserve formatting, headings, and structure where possible
- Include tables in a readable format
- Note any handwritten text if present

**For photos, diagrams, or non-text images:**
- Provide a detailed description of the content
- Describe key objects, people, and actions
- Note any visible text, labels, or captions
- Explain the context and purpose if apparent

Always be accurate and thorough. Do not invent or assume content that isn't visible.`,

  pdf: `You are an expert at extracting and structuring text from PDF documents.

- Extract all text content while preserving the logical structure
- Maintain headings, paragraphs, and section hierarchy
- Format lists and bullet points clearly
- Represent tables in a readable text format
- Preserve important formatting (bold, italics) using markdown where applicable
- Ignore headers, footers, and page numbers unless they contain important content
- If the PDF contains images, briefly describe their content in context

Output clean, well-organized text that captures the full meaning of the document.`,

  html: `You are an expert at converting HTML content to clean, readable markdown.

- Convert headings to appropriate markdown levels (# ## ###)
- Preserve links in [text](url) format
- Convert lists to markdown bullet points or numbered lists
- Format code blocks with proper syntax highlighting hints
- Convert tables to markdown table format
- Remove navigation, ads, and boilerplate content
- Keep only the main content that would be useful for reference
- Preserve emphasis (bold, italic) using markdown syntax

Output clean, semantic markdown that captures the essential content.`,

  text: `You are an expert at cleaning and structuring raw text content.

- Preserve the logical structure and flow of the content
- Fix formatting issues like inconsistent spacing or line breaks
- Organize content into clear paragraphs and sections
- Identify and format any lists or structured data
- Remove redundant whitespace and formatting artifacts
- Keep all meaningful content intact
- Use markdown formatting where it improves readability

Output clean, well-organized text that is easy to read and search.`,
};

export type ExtractTextContentArgs = {
  storageId: Id<"_storage">;
  filename: string;
  bytes?: ArrayBuffer;
  mimeType: string;
};

export async function extractTextContent(
  ctx: { storage: StorageActionWriter },
  args: ExtractTextContentArgs
): Promise<string> {
  const { storageId, filename, bytes, mimeType } = args;

  const url = await ctx.storage.getUrl(storageId);
  assert(url, "File not found in storage");

  if (SUPPORTED_IMAGE_TYPES.some((type) => type === mimeType)) {
    return extractImageText(url);
  }

  if (mimeType.toLowerCase().includes("pdf")) {
    return extractPdfText(url, mimeType, filename);
  }

  if (mimeType.toLowerCase().includes("text")) {
    return extractTextFileContent(ctx, storageId, bytes, mimeType);
  }

  throw new Error(
    `Unsupported MIME type: ${mimeType}. Cannot extract text content.`
  );
}

async function extractTextFileContent(
  ctx: { storage: StorageActionWriter },
  storageId: Id<"_storage">,
  bytes: ArrayBuffer | undefined,
  mimeType: string
): Promise<string> {
  const arrayBuffer =
    bytes || (await (await ctx.storage.get(storageId))?.arrayBuffer());

  if (!arrayBuffer) {
    throw new Error("Failed to read file content from storage.");
  }

  const text = new TextDecoder().decode(arrayBuffer);

  if (mimeType.toLowerCase() !== "text/plain") {
    const result = await generateText({
      model: AI_MODELS.text,
      system: SYSTEM_PROMPTS.text,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text,
            },
            {
              type: "text",
              text: "Extract the text and print it in a markdown format without explaining that you'll do so.", // instruction
            },
          ],
        },
      ],
    });
    return result.text;
  }
  return text;
}


async function extractPdfText(
  url: string,
  mimeType: string,
filename: string,
): Promise<string> {
    const result = await generateText({
        model: AI_MODELS.pdf,
        system: SYSTEM_PROMPTS.pdf,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "file",
                        data: new URL(url), 
                        mimeType, 
                        filename,
                    },
                    {
                        type: "text",
                        text: "Extract the text and print it without explaining that you'll do so.", // instruction
                    }
                ]
            }
        ],
    });
    return result.text;
};

async function extractImageText(url: string): Promise<string> {
    const result = await generateText({
        model: AI_MODELS.image,
        system: SYSTEM_PROMPTS.image,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image",
                        image: new URL(url),
                    },
                ]
            }
        ],
    });
    return result.text;
}