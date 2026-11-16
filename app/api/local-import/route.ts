import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const candidates = [
      path.resolve(process.cwd(), 'imported-data.json'),
      path.resolve(process.cwd(), 'public/imported-data.json'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const data = JSON.parse(raw);
        return NextResponse.json(data);
      }
    }
    return NextResponse.json({ nights: [] }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to read imported data' }, { status: 500 });
  }
}
