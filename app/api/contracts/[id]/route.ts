import { NextResponse } from 'next/server';
import { modifyContract, removeContract, getContract } from '@/lib/contracts-engine';
import { authFromRequest, hasPermission } from '@/lib/rbac';
import { isPluginEnabled } from '@/lib/plugins/guard';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(auth.role, 'contracts:read') || !isPluginEnabled('contracts')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const contract = getContract(params.id);
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  return NextResponse.json(contract);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'contracts:write')) {
    return NextResponse.json({ error: 'Forbidden: contracts managers only' }, { status: 403 });
  }
  if (!isPluginEnabled('contracts')) {
    return NextResponse.json({ error: 'Contracts plugin is disabled' }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const updated = modifyContract(params.id, body as never);
  if (!updated) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = authFromRequest(req);
  if (!auth || !hasPermission(auth.role, 'contracts:write')) {
    return NextResponse.json({ error: 'Forbidden: contracts managers only' }, { status: 403 });
  }
  if (!isPluginEnabled('contracts')) {
    return NextResponse.json({ error: 'Contracts plugin is disabled' }, { status: 403 });
  }
  const removed = removeContract(params.id);
  if (!removed) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}