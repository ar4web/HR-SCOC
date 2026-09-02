import { NextResponse } from 'next/server';
import {
  getUsers,
  getAuditLogs,
  addAuditLog,
  addUserToCompany,
  updateUserRole,
  updateUserProfile,
  removeUser,
} from '@/lib/admin-engine';
import { UserRole } from '@/types';
import { authFromRequest, hasPermission } from '@/lib/rbac';
export const dynamic = 'force-dynamic';

function adminOnly(req: Request): boolean {
  const auth = authFromRequest(req);
  return !!auth && hasPermission(auth.role, 'user:manage');
}

export async function GET(req: Request) {
  if (!adminOnly(req)) {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'users';

  if (type === 'audit') {
    return NextResponse.json({ data: getAuditLogs() });
  }

  return NextResponse.json({ data: getUsers() });
}

export async function POST(req: Request) {
  if (!adminOnly(req)) {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const role = (body.role as UserRole) || 'employee';
  const language = body.language === 'ar' ? 'ar' : 'en';

  const { user, error } = addUserToCompany({
    email: typeof body.email === 'string' ? body.email : '',
    name: typeof body.name === 'string' ? body.name : '',
    nameAr: typeof body.nameAr === 'string' ? body.nameAr : undefined,
    role,
    language,
    password: typeof body.password === 'string' ? body.password : undefined,
  });

  if (error || !user) {
    return NextResponse.json({ error: error || 'Failed to create user' }, { status: 400 });
  }

  addAuditLog('user-1', 'Admin User', 'User', `Created user ${user.email}`);
  return NextResponse.json({ user });
}

export async function PUT(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { userId?: string; role?: UserRole; name?: string; nameAr?: string; language?: 'en' | 'ar' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Any signed-in user may update their OWN name/language (settings/profile).
  // Changing roles or other users' accounts still requires user:manage.
  const isSelfProfileUpdate = body.userId === auth.sub && !body.role;
  if (!isSelfProfileUpdate && !hasPermission(auth.role, 'user:manage')) {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const result = body.role
    ? updateUserRole(body.userId, body.role)
    : updateUserProfile(body.userId, {
        name: body.name,
        nameAr: body.nameAr,
        language: body.language,
      });

  if (result.error || !result.user) {
    return NextResponse.json({ error: result.error || 'Failed to update user' }, { status: 400 });
  }

  addAuditLog('user-1', 'Admin User', 'User', `Updated user ${result.user.email}`);
  return NextResponse.json({ user: result.user });
}

export async function DELETE(req: Request) {
  if (!adminOnly(req)) {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  if (userId === 'user-1') {
    return NextResponse.json({ error: 'Cannot remove the primary admin account' }, { status: 400 });
  }

  const result = removeUser(userId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  addAuditLog('user-1', 'Admin User', 'User', `Removed user ${userId}`);
  return NextResponse.json({ success: true });
}
