import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/reports-engine';

export async function GET() {
  const stats = getDashboardStats();
  return NextResponse.json(stats);
}
