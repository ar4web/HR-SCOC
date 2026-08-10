import { create } from 'zustand';
import { ModuleDefinition, ModuleStates } from '@/types';
import { moduleService } from '@/modules/settings/service';

interface ModuleState {
  modules: ModuleDefinition[];
  moduleStates: ModuleStates;
  isLoading: boolean;
  fetchModules: () => Promise<void>;
  toggleModule: (moduleId: string, enabled?: boolean) => Promise<{ success: boolean; error?: string }>;
  isModuleEnabled: (moduleId: string) => boolean;
  getDependencyWarnings: (moduleId: string) => string[];
}

const defaultStates: ModuleStates = {
  'employee-management': true,
  'leave-management': true,
  'payroll': true,
  'attendance': true,
  'communication': true,
  'todo-management': true,
  'document-management': true,
  'email': true,
  'expense-management': true,
  'reports': true,
  'administration': true,
};

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: [],
  moduleStates: defaultStates,
  isLoading: true,

  fetchModules: async () => {
    const res = await moduleService.get();
    if (res.success && res.data) {
      set({
        modules: res.data.modules,
        moduleStates: res.data.states,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  toggleModule: async (moduleId, enabledOverride) => {
    const state = get();
    const moduleDef = state.modules.find((m) => m.id === moduleId);
    if (!moduleDef) return { success: false, error: 'Module not found' };

    const willEnable = enabledOverride ?? !state.moduleStates[moduleId];
    const prospective: ModuleStates = {
      ...state.moduleStates,
      [moduleId]: willEnable,
    };

    if (willEnable) {
      const missingDeps = moduleDef.dependencies.filter((depId) => !prospective[depId]);
      if (missingDeps.length > 0) {
        const names = missingDeps
          .map((depId) => state.modules.find((m) => m.id === depId)?.name || depId)
          .join(', ');
        return { success: false, error: `Required modules: ${names}` };
      }
    } else {
      const dependents = state.modules.filter(
        (m) => prospective[m.id] && m.id !== moduleId && m.dependencies.includes(moduleId)
      );
      if (dependents.length > 0) {
        const names = dependents.map((m) => m.name).join(', ');
        return {
          success: false,
          error: `Cannot disable: ${names} depend${dependents.length === 1 ? 's' : ''} on this module`,
        };
      }
    }

    const res = await moduleService.updateStates(prospective);
    if (res.success && res.data) {
      const { modules, states } = res.data;
      set({
        moduleStates: states,
        modules: modules.map((m) => ({ ...m, enabled: states[m.id] ?? m.enabled })),
      });
      return { success: true };
    }
    return { success: false, error: res.error };
  },

  isModuleEnabled: (moduleId) => {
    return get().moduleStates[moduleId] ?? false;
  },

  getDependencyWarnings: (moduleId) => {
    const moduleDef = get().modules.find((m) => m.id === moduleId);
    if (!moduleDef) return [];
    return moduleDef.dependencies.filter((depId) => !get().moduleStates[depId]);
  },
}));
