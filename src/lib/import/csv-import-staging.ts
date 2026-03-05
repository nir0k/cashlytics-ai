import { createHash } from "node:crypto";
import { z } from "zod";

const MAX_CSV_UPLOAD_BYTES = 1 * 1024 * 1024;
const MAX_CSV_ROWS = 5000;
const CSV_MIME_TYPES = ["text/csv", "application/csv", "application/vnd.ms-excel"];

const requiredCanonicalHeaders = ["booking_date", "amount", "currency"] as const;

const csvRowSchema = z.object({
  bookingDate: z.date(),
  amount: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Number.parseFloat(value)), "Amount must be numeric"),
  currency: z.string().trim().min(1).max(10),
  description: z.string().trim().min(1).max(255),
  counterparty: z.string().trim().max(255).nullable(),
  senderAccount: z.string().trim().max(255).nullable(),
  receiverAccount: z.string().trim().max(255).nullable(),
  balanceAfterBooking: z.string().trim().max(64).nullable(),
  reference: z.string().trim().max(255).nullable(),
});

export type CanonicalHeader =
  | "booking_date"
  | "amount"
  | "currency"
  | "description"
  | "counterparty"
  | "sender_account"
  | "receiver_account"
  | "balance_after_booking"
  | "reference";

export type HeaderMapping = Partial<Record<CanonicalHeader, string>>;

export type NormalizedCsvRow = {
  rowIndex: number;
  bookingDate: Date;
  amount: string;
  currency: string;
  description: string;
  counterparty: string | null;
  senderAccount: string | null;
  receiverAccount: string | null;
  balanceAfterBooking: string | null;
  reference: string | null;
};

export type ParseCsvSuccess = {
  success: true;
  delimiter: ";" | ",";
  rows: NormalizedCsvRow[];
};

export type ParseCsvFailure = {
  success: false;
  error: string;
};

export type ParseCsvResult = ParseCsvSuccess | ParseCsvFailure;

export type CsvImportStagingInput = {
  userId: string;
  accountId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  csvContent: string;
  headerMapping?: HeaderMapping;
};

export type CsvImportStagingSuccess = {
  success: true;
  data: {
    sessionId: string;
    stagedRows: number;
    totalRows: number;
  };
};

export type CsvImportStagingFailure = {
  success: false;
  error: string;
};

export type CsvImportStagingResult = CsvImportStagingSuccess | CsvImportStagingFailure;

export type CsvStagingStore = {
  isAccountOwnedByUser(userId: string, accountId: string): Promise<boolean>;
  createSessionWithRows(params: {
    userId: string;
    accountId: string;
    sourceFileName: string;
    sourceFileHash: string;
    rows: NormalizedCsvRow[];
  }): Promise<{ sessionId: string }>;
};

export type CsvImportStagingServiceDeps = {
  store: CsvStagingStore;
};

const canonicalHeaderAliases: Record<CanonicalHeader, string[]> = {
  booking_date: ["booking_date", "bookingdate", "buchungsdatum", "bogforingsdato", "date"],
  amount: ["amount", "betrag", "belob", "belobdkk"],
  currency: ["currency", "valuta", "waehrung", "wahrung"],
  description: ["description", "beskrivelse", "verwendungszweck", "text", "beschreibung"],
  counterparty: ["counterparty", "navn", "name", "gegenpartei"],
  sender_account: ["sender_account", "senderaccount", "afsender", "absender"],
  receiver_account: ["receiver_account", "receiveraccount", "modtager", "empfanger"],
  balance_after_booking: ["balance_after_booking", "saldo", "kontostand"],
  reference: ["reference", "referenz", "belegnummer"],
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function splitCsvLine(line: string, delimiter: ";" | ","): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function detectDelimiter(headerLine: string): ";" | "," {
  const semicolonCount = splitCsvLine(headerLine, ";").length;
  const commaCount = splitCsvLine(headerLine, ",").length;
  return semicolonCount >= commaCount ? ";" : ",";
}

function buildHeaderIndex(headers: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  headers.forEach((header, position) => {
    const normalized = normalizeHeader(header);
    if (!(normalized in index)) {
      index[normalized] = position;
    }
  });
  return index;
}

function resolveHeaderMapping(
  headers: string[],
  manualMapping?: HeaderMapping
): Map<CanonicalHeader, number> {
  const indexByNormalizedHeader = buildHeaderIndex(headers);
  const mapping = new Map<CanonicalHeader, number>();

  for (const [canonicalHeader, aliases] of Object.entries(canonicalHeaderAliases) as [
    CanonicalHeader,
    string[],
  ][]) {
    const manualHeader = manualMapping?.[canonicalHeader];
    if (manualHeader) {
      const manualIndex = indexByNormalizedHeader[normalizeHeader(manualHeader)];
      if (manualIndex !== undefined) {
        mapping.set(canonicalHeader, manualIndex);
        continue;
      }
    }

    const matchedAlias = aliases.find((alias) => indexByNormalizedHeader[alias] !== undefined);
    if (matchedAlias) {
      mapping.set(canonicalHeader, indexByNormalizedHeader[matchedAlias]);
    }
  }

  return mapping;
}

function normalizeAmount(rawValue: string): string {
  const compact = rawValue.replace(/\s+/g, "").replace(/[^0-9,.-]/g, "");
  if (compact.length === 0) {
    throw new Error("Amount is empty");
  }

  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");
  let normalized = compact;

  if (hasComma && hasDot) {
    const decimalSeparator = compact.lastIndexOf(",") > compact.lastIndexOf(".") ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? /\./g : /,/g;
    normalized = compact.replace(thousandsSeparator, "").replace(decimalSeparator, ".");
  } else if (hasComma) {
    normalized = compact.replace(/\./g, "").replace(/,/g, ".");
  } else {
    normalized = compact.replace(/,/g, "");
  }

  const amount = Number.parseFloat(normalized);
  if (Number.isNaN(amount)) {
    throw new Error(`Amount is invalid: ${rawValue}`);
  }

  return amount.toFixed(2);
}

function normalizeDate(rawValue: string): Date {
  const value = rawValue.trim();
  if (!value) {
    throw new Error("Date is empty");
  }

  const normalizeYear = (rawYear: string): number => {
    if (rawYear.length === 4) {
      return Number.parseInt(rawYear, 10);
    }

    const twoDigitYear = Number.parseInt(rawYear, 10);
    return twoDigitYear >= 70 ? 1900 + twoDigitYear : 2000 + twoDigitYear;
  };

  const createUtcDate = (year: number, month: number, day: number): Date => {
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error(`Date format is invalid: ${rawValue}`);
    }

    return date;
  };

  const parts = value.split(/[\/.\-]/);
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`Date format is invalid: ${rawValue}`);
  }

  if (parts[0]?.length === 4) {
    const year = normalizeYear(parts[0]);
    const month = Number.parseInt(parts[1] ?? "", 10);
    const day = Number.parseInt(parts[2] ?? "", 10);
    return createUtcDate(year, month, day);
  }

  const day = Number.parseInt(parts[0] ?? "", 10);
  const month = Number.parseInt(parts[1] ?? "", 10);
  const year = normalizeYear(parts[2] ?? "");
  return createUtcDate(year, month, day);
}

function getMappedValue(
  row: string[],
  mapping: Map<CanonicalHeader, number>,
  key: CanonicalHeader
): string {
  const index = mapping.get(key);
  if (index === undefined) {
    return "";
  }
  return row[index] ?? "";
}

export function parseAndNormalizeCsv(
  csvContent: string,
  headerMapping?: HeaderMapping
): ParseCsvResult {
  const normalizedContent = csvContent
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!normalizedContent) {
    return { success: false, error: "CSV file is empty" };
  }

  const lines = normalizedContent.split("\n");
  if (lines.length < 2) {
    return { success: false, error: "CSV file must include header and at least one row" };
  }

  if (lines.length - 1 > MAX_CSV_ROWS) {
    return { success: false, error: `CSV exceeds row limit (${MAX_CSV_ROWS})` };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter);
  const mapping = resolveHeaderMapping(headers, headerMapping);

  const missingHeaders = requiredCanonicalHeaders.filter((header) => !mapping.has(header));
  if (missingHeaders.length > 0) {
    return {
      success: false,
      error: `CSV header mapping missing required fields: ${missingHeaders.join(", ")}`,
    };
  }

  const rows: NormalizedCsvRow[] = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const parsedLine = splitCsvLine(lines[lineIndex], delimiter);
    const isEmptyRow = parsedLine.every((cell) => cell.trim().length === 0);
    if (isEmptyRow) {
      continue;
    }

    try {
      const bookingDate = normalizeDate(getMappedValue(parsedLine, mapping, "booking_date"));
      const amount = normalizeAmount(getMappedValue(parsedLine, mapping, "amount"));
      const currency = getMappedValue(parsedLine, mapping, "currency").trim().toUpperCase();
      const description =
        getMappedValue(parsedLine, mapping, "description").trim() ||
        getMappedValue(parsedLine, mapping, "counterparty").trim() ||
        `Imported row ${lineIndex}`;
      const counterparty = getMappedValue(parsedLine, mapping, "counterparty").trim() || null;
      const senderAccount = getMappedValue(parsedLine, mapping, "sender_account").trim() || null;
      const receiverAccount =
        getMappedValue(parsedLine, mapping, "receiver_account").trim() || null;
      const balanceAfterBookingRaw =
        getMappedValue(parsedLine, mapping, "balance_after_booking").trim() || null;
      const balanceAfterBooking = balanceAfterBookingRaw
        ? normalizeAmount(balanceAfterBookingRaw)
        : null;
      const reference = getMappedValue(parsedLine, mapping, "reference").trim() || null;

      const validatedRow = csvRowSchema.safeParse({
        bookingDate,
        amount,
        currency,
        description,
        counterparty,
        senderAccount,
        receiverAccount,
        balanceAfterBooking,
        reference,
      });

      if (!validatedRow.success) {
        return {
          success: false,
          error: `Row ${lineIndex} failed validation: ${validatedRow.error.issues[0]?.message ?? "Invalid row"}`,
        };
      }

      rows.push({
        rowIndex: lineIndex,
        ...validatedRow.data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown CSV parsing error";
      return {
        success: false,
        error: `Row ${lineIndex} parsing failed: ${message}`,
      };
    }
  }

  if (rows.length === 0) {
    return { success: false, error: "CSV does not contain parsable rows" };
  }

  return { success: true, delimiter, rows };
}

function isAllowedCsvMimeType(mimeType: string): boolean {
  return CSV_MIME_TYPES.includes(mimeType);
}

export function createCsvImportStagingService(deps: CsvImportStagingServiceDeps) {
  return {
    async stageCsvUpload(input: CsvImportStagingInput): Promise<CsvImportStagingResult> {
      if (input.fileSize <= 0) {
        return { success: false, error: "CSV file is empty" };
      }

      if (input.fileSize > MAX_CSV_UPLOAD_BYTES) {
        return {
          success: false,
          error: `CSV file too large. Maximum size is ${Math.floor(MAX_CSV_UPLOAD_BYTES / 1024 / 1024)}MB`,
        };
      }

      if (!isAllowedCsvMimeType(input.mimeType)) {
        return { success: false, error: "Unsupported file type. Please upload a CSV file" };
      }

      const accountOwnedByUser = await deps.store.isAccountOwnedByUser(
        input.userId,
        input.accountId
      );
      if (!accountOwnedByUser) {
        return { success: false, error: "Account not found or not owned by user" };
      }

      const parseResult = parseAndNormalizeCsv(input.csvContent, input.headerMapping);
      if (!parseResult.success) {
        return { success: false, error: parseResult.error };
      }

      const sourceFileHash = createHash("sha256").update(input.csvContent).digest("hex");
      const { sessionId } = await deps.store.createSessionWithRows({
        userId: input.userId,
        accountId: input.accountId,
        sourceFileName: input.fileName,
        sourceFileHash,
        rows: parseResult.rows,
      });

      return {
        success: true,
        data: {
          sessionId,
          stagedRows: parseResult.rows.length,
          totalRows: parseResult.rows.length,
        },
      };
    },
  };
}

export { MAX_CSV_UPLOAD_BYTES };
