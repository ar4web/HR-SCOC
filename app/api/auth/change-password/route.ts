import { NextResponse } from 'next/server';
import { users, persistData } from '@/lib/mock-data';
import { authFromRequest } from '@/lib/rbac';
import { verifyPassword, hashPassword } from '@/lib/passwords';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }

  const user = users.get(auth.sub);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!verifyPassword(currentPassword, user.password)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  users.set(user.id, { ...user, password: hashPassword(newPassword) });
  persistData();
  return NextResponse.json({ success: true });
}
