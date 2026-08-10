import { NextResponse } from 'next/server';
import { users, employees, persistData } from '@/lib/mock-data';
import { encodeToken } from '@/lib/rbac';
import { verifyPassword, shouldRehash, hashPassword } from '@/lib/passwords';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  const userEntry = Array.from(users.values()).find(
    (u) => u.email === email && verifyPassword(password, u.password)
  );

  if (!userEntry) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  }

  if (shouldRehash(userEntry.password)) {
    users.set(userEntry.id, { ...userEntry, password: hashPassword(password) });
    persistData();
  }

  const user = Object.fromEntries(
    Object.entries(userEntry).filter(([key]) => key !== 'password')
  );
  const linkedEmployee = Array.from(employees.values()).find((e) => e.userId === user.id);
  const token = encodeToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    employeeId: linkedEmployee?.id,
    companyId: user.companyId,
  });

  return NextResponse.json({ user, token });
}
