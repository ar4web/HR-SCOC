import { api } from '@/lib/api';
import { ModuleDefinition, ModuleStates } from '@/types';

export interface ModulesResponse {
  modules: ModuleDefinition[];
  states: ModuleStates;
}

export const moduleService = {
  get: () => api.get<ModulesResponse>('/modules'),

  updateStates: (moduleStates: ModuleStates) =>
    api.put<ModulesResponse>('/modules', { moduleStates }),
};

export type SettingsSection =
  | 'work-week'
  | 'holidays'
  | 'leave-policies'
  | 'working-hours'
  | 'weekend'
  | 'overtime';

export const settingsService = {
  get: (section: SettingsSection) => api.get<unknown>(`/settings/${section}`),

  update: (section: SettingsSection, body: unknown) =>
    api.put<unknown>(`/settings/${section}`, body),
};
