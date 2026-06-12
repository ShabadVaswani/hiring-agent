import pdf from "pdf-parse";

export async function extractPdfText(fileBuffer: Buffer): Promise<string> {
  const parsed = await pdf(fileBuffer);
  return parsed.text ?? "";
}
