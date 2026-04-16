// ─── QIVE (Arquivei) API Client ─────────────────────────────────────────────
// Base URL Prod: https://api.arquivei.com.br
// Base URL Sandbox: https://sandbox-api.arquivei.com.br
// Auth: x-api-id + x-api-key headers
// Docs: https://developers.qive.com.br/docs

const QIVE_BASE_URL =
  process.env.QIVE_SANDBOX === "true"
    ? "https://sandbox-api.arquivei.com.br"
    : "https://api.arquivei.com.br";

export interface QiveNFeData {
  access_key: string;
  xml: string; // base64 encoded XML
}

export interface QiveResponse {
  status: {
    code: number;
    message: string;
  };
  data: QiveNFeData[];
  page: {
    next: string | null;
    previous: string | null;
  };
  count: number;
}

export interface ParsedNFe {
  accessKey: string;
  invoiceNumber: string;
  series: string;
  issueDate: Date;
  cnpjIssuer: string;
  issuerName: string;
  cnpjRecipient: string;
  totalValue: number;
  cfop: string;
  icmsValue: number;
  ipiValue: number;
  pisValue: number;
  cofinsValue: number;
  productDescription: string;
}

/** Default timeout for QIVE API requests (30 seconds) */
const QIVE_TIMEOUT_MS = 30_000;

/** Maximum retry attempts for transient errors */
const QIVE_MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const QIVE_RETRY_BASE_MS = 1_000;

/**
 * Fetch received NFes from QIVE API with timeout and retry.
 */
export async function fetchReceivedNFes(
  apiId: string,
  apiKey: string,
  cursor?: string,
  limit: number = 50
): Promise<QiveResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));

  const url = `${QIVE_BASE_URL}/v1/nfe/received?${params.toString()}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < QIVE_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QIVE_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          "x-api-id": apiId,
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`QIVE API error (${response.status}): ${errorText}`);
        }
        // 5xx or 429 — retry with backoff
        lastError = new Error(`QIVE API error (${response.status}): ${errorText}`);
      } else {
        return response.json();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = new Error(`QIVE API timeout after ${QIVE_TIMEOUT_MS}ms`);
      } else if (err instanceof Error && err.message.startsWith("QIVE API error (4")) {
        // Client error (non-retryable) — rethrow immediately
        throw err;
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < QIVE_MAX_RETRIES - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, QIVE_RETRY_BASE_MS * Math.pow(2, attempt))
      );
    }
  }

  throw lastError ?? new Error("QIVE API request failed after retries");
}

/**
 * Fetch ALL received NFes, paginating automatically.
 * Supports a checkpoint callback so callers can persist progress
 * and resume from the last cursor on failure.
 */
export async function fetchAllReceivedNFes(
  apiId: string,
  apiKey: string,
  startCursor?: string,
  onPageFetched?: (cursor: string | null, pageNfes: QiveNFeData[]) => Promise<void>,
): Promise<{ nfes: QiveNFeData[]; lastCursor: string | null }> {
  const allNfes: QiveNFeData[] = [];
  let cursor = startCursor || undefined;
  let lastCursor: string | null = null;

  while (true) {
    const response = await fetchReceivedNFes(apiId, apiKey, cursor);

    if (response.data && response.data.length > 0) {
      allNfes.push(...response.data);
    }

    lastCursor = response.page?.next || null;

    // Checkpoint: persist cursor so we can resume on failure
    if (onPageFetched) {
      await onPageFetched(lastCursor, response.data ?? []);
    }

    if (!lastCursor || response.data.length === 0) {
      break;
    }

    cursor = lastCursor;
  }

  return { nfes: allNfes, lastCursor };
}

/**
 * Test QIVE API credentials
 */
export async function testQiveCredentials(
  apiId: string,
  apiKey: string
): Promise<boolean> {
  try {
    const response = await fetchReceivedNFes(apiId, apiKey, undefined, 1);
    return response.status?.code === 0 || response.status?.code === undefined;
  } catch {
    return false;
  }
}

// ─── XML Parsing ─────────────────────────────────────────────────────────────

/**
 * Extract a value between XML tags using regex
 */
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match?.[1]?.trim() || "";
}

/**
 * Extract numeric value from XML tag
 */
function extractNumber(xml: string, tag: string): number {
  const val = extractTag(xml, tag);
  return val ? parseFloat(val) || 0 : 0;
}

/**
 * Parse NFe XML (base64 encoded) into structured data
 */
export function parseNFeXML(xmlBase64: string, accessKey: string): ParsedNFe {
  // Decode base64 to string
  const xml = Buffer.from(xmlBase64, "base64").toString("utf-8");

  // Extract emitter (emit) section
  const emitSection = xml.match(/<emit>([\s\S]*?)<\/emit>/)?.[1] || "";
  const cnpjIssuer = extractTag(emitSection, "CNPJ");
  const issuerName = extractTag(emitSection, "xNome");

  // Extract recipient (dest) section
  const destSection = xml.match(/<dest>([\s\S]*?)<\/dest>/)?.[1] || "";
  const cnpjRecipient =
    extractTag(destSection, "CNPJ") || extractTag(destSection, "CPF");

  // Extract invoice identification (ide)
  const ideSection = xml.match(/<ide>([\s\S]*?)<\/ide>/)?.[1] || "";
  const invoiceNumber = extractTag(ideSection, "nNF");
  const series = extractTag(ideSection, "serie");
  const issueDateStr = extractTag(ideSection, "dhEmi");

  // Parse date (format: 2024-01-15T10:30:00-03:00)
  let issueDate: Date;
  if (issueDateStr) {
    issueDate = new Date(issueDateStr);
    if (isNaN(issueDate.getTime())) {
      issueDate = new Date();
    }
  } else {
    issueDate = new Date();
  }

  // Extract totals (ICMSTot)
  const totSection =
    xml.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/)?.[1] || "";
  const totalValue = extractNumber(totSection, "vNF");
  const icmsValue = extractNumber(totSection, "vICMS");
  const ipiValue = extractNumber(totSection, "vIPI");
  const pisValue = extractNumber(totSection, "vPIS");
  const cofinsValue = extractNumber(totSection, "vCOFINS");

  // Extract first product info
  const detSection = xml.match(/<det[^>]*>([\s\S]*?)<\/det>/)?.[1] || "";
  const prodSection =
    detSection.match(/<prod>([\s\S]*?)<\/prod>/)?.[1] || "";
  const cfop = extractTag(prodSection, "CFOP");
  const productDescription = extractTag(prodSection, "xProd");

  return {
    accessKey,
    invoiceNumber,
    series,
    issueDate,
    cnpjIssuer,
    issuerName,
    cnpjRecipient,
    totalValue,
    cfop,
    icmsValue,
    ipiValue,
    pisValue,
    cofinsValue,
    productDescription,
  };
}

/**
 * Parse raw NFe XML string (not base64) into structured data.
 * Used for direct XML file uploads.
 */
export function parseNFeXMLRaw(xml: string): ParsedNFe {
  // Try to extract access key from <infNFe Id="NFe..."> or <chNFe>
  let accessKey = "";
  const infNFeMatch = xml.match(/<infNFe[^>]*Id="NFe([^"]+)"/i);
  if (infNFeMatch) {
    accessKey = infNFeMatch[1];
  } else {
    const chNFeMatch = xml.match(/<chNFe>([^<]+)<\/chNFe>/i);
    if (chNFeMatch) accessKey = chNFeMatch[1];
  }

  // Extract emitter (emit) section
  const emitSection = xml.match(/<emit>([\s\S]*?)<\/emit>/)?.[1] || "";
  const cnpjIssuer = extractTag(emitSection, "CNPJ");
  const issuerName = extractTag(emitSection, "xNome");

  // Extract recipient (dest) section
  const destSection = xml.match(/<dest>([\s\S]*?)<\/dest>/)?.[1] || "";
  const cnpjRecipient =
    extractTag(destSection, "CNPJ") || extractTag(destSection, "CPF");

  // Extract invoice identification (ide)
  const ideSection = xml.match(/<ide>([\s\S]*?)<\/ide>/)?.[1] || "";
  const invoiceNumber = extractTag(ideSection, "nNF");
  const series = extractTag(ideSection, "serie");
  const issueDateStr = extractTag(ideSection, "dhEmi");

  let issueDate: Date;
  if (issueDateStr) {
    issueDate = new Date(issueDateStr);
    if (isNaN(issueDate.getTime())) issueDate = new Date();
  } else {
    issueDate = new Date();
  }

  // Extract totals (ICMSTot)
  const totSection =
    xml.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/)?.[1] || "";
  const totalValue = extractNumber(totSection, "vNF");
  const icmsValue = extractNumber(totSection, "vICMS");
  const ipiValue = extractNumber(totSection, "vIPI");
  const pisValue = extractNumber(totSection, "vPIS");
  const cofinsValue = extractNumber(totSection, "vCOFINS");

  // Extract first product info
  const detSection = xml.match(/<det[^>]*>([\s\S]*?)<\/det>/)?.[1] || "";
  const prodSection =
    detSection.match(/<prod>([\s\S]*?)<\/prod>/)?.[1] || "";
  const cfop = extractTag(prodSection, "CFOP");
  const productDescription = extractTag(prodSection, "xProd");

  return {
    accessKey,
    invoiceNumber,
    series,
    issueDate,
    cnpjIssuer,
    issuerName,
    cnpjRecipient,
    totalValue,
    cfop,
    icmsValue,
    ipiValue,
    pisValue,
    cofinsValue,
    productDescription,
  };
}
