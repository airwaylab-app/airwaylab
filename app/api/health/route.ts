import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const version = process.env.npm_package_version ?? 'unknown';

  return NextResponse.json({ status: 'ok', version });
}
