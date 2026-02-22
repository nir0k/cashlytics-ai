import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { rateLimit } from '@/lib/rate-limiter';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

function isValidIntegerId(value: string | null): boolean {
  if (!value) return false;
  return /^\d+$/.test(value) && Number.isInteger(Number(value)) && Number(value) > 0;
}

function hasPathTraversal(fileName: string): boolean {
  return fileName.includes('..') || fileName.includes('/') || fileName.includes('\\');
}

export async function POST(req: Request) {
  // Rate limiting: 10 uploads per minute per IP
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'local';
  const rl = rateLimit(`documents:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    const retryAfterSecs = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte warte einen Moment.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSecs) } }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const expenseId = formData.get('expenseId') as string | null;
    const dailyExpenseId = formData.get('dailyExpenseId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    if (!expenseId && !dailyExpenseId) {
      return NextResponse.json({ error: 'expenseId oder dailyExpenseId erforderlich' }, { status: 400 });
    }

    if (expenseId !== null && !isValidIntegerId(expenseId)) {
      return NextResponse.json(
        { error: 'Ungültige expenseId. Muss eine positive Ganzzahl sein.' },
        { status: 400 }
      );
    }

    if (dailyExpenseId !== null && !isValidIntegerId(dailyExpenseId)) {
      return NextResponse.json(
        { error: 'Ungültige dailyExpenseId. Muss eine positive Ganzzahl sein.' },
        { status: 400 }
      );
    }

    if (hasPathTraversal(file.name)) {
      return NextResponse.json(
        { error: 'Ungültiger Dateiname. Pfadangaben sind nicht erlaubt.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Ungültiger Dateityp. Erlaubt: PDF, PNG, JPG, JPEG' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Datei zu groß. Maximum: 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    const [document] = await db
      .insert(documents)
      .values({
        expenseId: expenseId || null,
        dailyExpenseId: dailyExpenseId || null,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        data: base64,
      })
      .returning();

    return NextResponse.json({ id: document.id, fileName: document.fileName }, { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const allDocuments = await db.select().from(documents);
    return NextResponse.json(
      allDocuments.map((d) => ({ id: d.id, fileName: d.fileName, mimeType: d.mimeType, size: d.size }))
    );
  } catch (error) {
    console.error('Document fetch error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}
