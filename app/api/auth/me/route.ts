import { NextResponse } from 'next/server';
import { users } from '@/lib/mock-data';
import { decodeToken } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auth = decodeToken(authHeader.slice(7));
    if (!auth) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userEntry = users.get(auth.sub);
    if (!userEntry) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = Object.fromEntries(
      Object.entries(userEntry).filter(([key]) => key !== 'password')
    );
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
