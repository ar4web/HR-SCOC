import { NextResponse } from 'next/server';
import { users } from '@/lib/mock-data';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  const userEntry = Array.from(users.values()).find(
    (u) => u.email === email && u.password === password
  );

  if (!userEntry) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  }

  const { password: _, ...user } = userEntry;
  const token = btoa(JSON.stringify({ userId: user.id, email: user.email, exp: Date.now() + 86400000 }));

  return NextResponse.json({ user, token });
}
