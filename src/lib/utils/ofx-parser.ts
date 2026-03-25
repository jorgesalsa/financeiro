export interface OFXTransaction {
  date: Date;
  amount: number;
  description: string;
  document: string;
  type: "CREDIT" | "DEBIT";
  balance?: number;
}

export function parseOFX(content: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];

  // Extract STMTTRN blocks
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = trnRegex.exec(content)) !== null) {
    const block = match[1];

    const dtPosted = extractTag(block, "DTPOSTED");
    const trnAmt = extractTag(block, "TRNAMT");
    const memo = extractTag(block, "MEMO") || extractTag(block, "NAME") || "";
    const fitId = extractTag(block, "FITID") || "";
    const trnType = extractTag(block, "TRNTYPE") || "";

    if (dtPosted && trnAmt) {
      const amount = parseFloat(trnAmt);
      transactions.push({
        date: parseOFXDate(dtPosted),
        amount: Math.abs(amount),
        description: memo.trim(),
        document: fitId.trim(),
        type: amount >= 0 ? "CREDIT" : "DEBIT",
      });
    }
  }

  // Try to extract LEDGERBAL
  const balAmt = extractTag(content, "BALAMT");
  if (balAmt && transactions.length > 0) {
    transactions[transactions.length - 1].balance = parseFloat(balAmt);
  }

  return transactions;
}

function extractTag(block: string, tagName: string): string | null {
  // Handle both <TAG>value</TAG> and <TAG>value\n formats
  const regex1 = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, "i");
  const regex2 = new RegExp(`<${tagName}>([^\\n<]+)`, "i");

  const match = regex1.exec(block) || regex2.exec(block);
  return match ? match[1].trim() : null;
}

function parseOFXDate(dateStr: string): Date {
  // OFX dates: YYYYMMDDHHMMSS or YYYYMMDD
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}
