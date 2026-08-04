import { NextResponse } from 'next/server';
import { users } from '@/lib/mock-data';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(atob(token));
    const userEntry = users.get(payload.userId);

    if (!userEntry) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password: _, ...user } = userEntry;
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
