/** Plugin registry — declares installable plugins (pages, nav, settings, permissions) that
 *  extend the HR app. Bundled plugins are toggled to install from the Plugin Manager.
 */

export interface PluginPageDef {
  route: string;
  label: { en: string; ar: string };
  icon: string;
}

export interface PluginDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  version: string;
  premium: boolean;
  dependencies: string[];
  pages: PluginPageDef[];
  permissions: string[];
}

export const PLUGIN_REGISTRY: PluginDefinition[] = [
  {
    id: 'contracts',
    name: 'Contracts & Agreements',
    nameAr: 'العقود والاتفاقيات',
    description: 'Employment contracts, service agreements and NDAs with automatic expiry tracking and renewal-window alerts.',
    descriptionAr: 'عقود العمل واتفاقيات الخدمة واتفاقيات عدم الإفصاح مع تتبع انتهاء الصلاحية وتنبيهات نافذة التجديد.',
    icon: 'FileText',
    version: '1.0.0',
    premium: false,
    dependencies: ['employee-management'],
    pages: [
      { route: '/contracts', label: { en: 'Contracts', ar: 'العقود' }, icon: 'FileText' },
    ],
    permissions: ['contracts:read', 'contracts:write'],
  },
];

export function findPlugin(id: string): PluginDefinition | undefined {
  return PLUGIN_REGISTRY.find((p) => p.id === id);
}

export function isPluginPage(pathname: string): PluginDefinition | undefined {
  return PLUGIN_REGISTRY.find((p) => p.pages.some((pg) => pathname === pg.route || pathname.startsWith(`${pg.route}/`)));
}