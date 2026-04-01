type ExtractionMethod =
  | "plain-text"
  | "pdf"
  | "docx"
  | "image-metadata"
  | "unsupported"
  | "failed";

export type ExtractedDocumentText = {
  extractedText?: string;
  processed: boolean;
  method: ExtractionMethod;
  summary: string;
};

function normalizeText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

export async function extractDocumentText({
  buffer,
  fileName,
  fileType,
  mimeType,
}: {
  buffer: Buffer;
  fileName: string;
  fileType: "pdf" | "docx" | "image";
  mimeType: string;
}): Promise<ExtractedDocumentText> {
  const lowerName = fileName.toLowerCase();

  try {
    if (mimeType.startsWith("text/")) {
      const extractedText = normalizeText(buffer.toString("utf8").slice(0, 20000));
      return {
        extractedText,
        processed: Boolean(extractedText),
        method: "plain-text",
        summary: extractedText
          ? "Plain text document extracted successfully."
          : "The text file was readable but contained no usable text.",
      };
    }

    if (fileType === "docx" || lowerName.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const extractedText = normalizeText(result.value?.slice(0, 20000));

      return {
        extractedText,
        processed: Boolean(extractedText),
        method: "docx",
        summary: extractedText
          ? "DOCX text extracted successfully."
          : "The DOCX file was processed but no readable text was found.",
      };
    }

    if (fileType === "pdf" || lowerName.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      const extractedText = normalizeText(result.text?.slice(0, 20000));

      return {
        extractedText,
        processed: Boolean(extractedText),
        method: "pdf",
        summary: extractedText
          ? "PDF text extracted successfully."
          : "The PDF was parsed but contained no readable text.",
      };
    }

    if (fileType === "image") {
      return {
        extractedText: undefined,
        processed: false,
        method: "image-metadata",
        summary:
          "Image uploaded successfully. OCR is not enabled yet, so discovery will use the file and any manual notes as context.",
      };
    }

    return {
      extractedText: undefined,
      processed: false,
      method: "unsupported",
      summary: "This file type is not yet supported for automatic text extraction.",
    };
  } catch (error) {
    console.error("Document text extraction failed:", error);
    return {
      extractedText: undefined,
      processed: false,
      method: "failed",
      summary:
        "Automatic extraction failed for this document, but the file is still stored for manual review and future analysis.",
    };
  }
}
