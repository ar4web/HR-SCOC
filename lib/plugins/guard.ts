import { companies } from '@/lib/mock-data';

/** Server-side check: is a bundled plugin currently enabled for the company? */
export function isPluginEnabled(pluginId: string): boolean {
  const company = companies.get('demo-company');
  return company?.moduleStates?.[pluginId] !== false;
}