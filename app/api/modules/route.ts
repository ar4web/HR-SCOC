import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { companies, moduleDefinitions, setModuleStates } from '@/lib/mock-data';
import { ModuleStates } from '@/types';
import { MODULE_STATES_COOKIE } from '@/lib/module-route-map';

export async function GET() {
  const company = companies.get('demo-company');
  const states = company?.moduleStates ?? {};

  const cookieStore = cookies();
  cookieStore.set(MODULE_STATES_COOKIE, JSON.stringify(states), { path: '/', httpOnly: true });

  return NextResponse.json({
    modules: moduleDefinitions,
    states,
  });
}

function validateModuleStates(states: ModuleStates): string | null {
  const enabledIds = Object.entries(states)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);

  for (const mod of moduleDefinitions) {
    if (states[mod.id] === true) {
      const missingDeps = mod.dependencies.filter((depId) => !states[depId]);
      if (missingDeps.length > 0) {
        const names = missingDeps
          .map((depId) => moduleDefinitions.find((m) => m.id === depId)?.name || depId)
          .join(', ');
        return `Module ${mod.name} requires: ${names}`;
      }
    }
  }

  for (const mod of moduleDefinitions) {
    if (states[mod.id] === false && enabledIds.includes(mod.id) === false) {
      const dependents = moduleDefinitions.filter(
        (m) => states[m.id] === true && m.id !== mod.id && m.dependencies.includes(mod.id)
      );
      if (dependents.length > 0) {
        const names = dependents.map((m) => m.name).join(', ');
        return `Cannot disable ${mod.name}: ${names} depend on it`;
      }
    }
  }

  return null;
}

export async function PUT(req: Request) {
  const company = companies.get('demo-company');
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  let body: { moduleStates?: ModuleStates };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const moduleStates = body.moduleStates;
  if (!moduleStates || typeof moduleStates !== 'object' || Array.isArray(moduleStates)) {
    return NextResponse.json({ error: 'moduleStates is required' }, { status: 400 });
  }

  const merged: ModuleStates = { ...company.moduleStates, ...moduleStates };

  const validationError = validateModuleStates(merged);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  setModuleStates(merged);

  const cookieStore = cookies();
  cookieStore.set(MODULE_STATES_COOKIE, JSON.stringify(merged), { path: '/', httpOnly: true });

  return NextResponse.json({
    modules: moduleDefinitions,
    states: merged,
  });
}
