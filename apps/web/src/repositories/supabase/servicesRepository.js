import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  getServiceCategoriesByTenant as getMockServiceCategoriesByTenant,
  getServiceHistoryByTenant as getMockServiceHistoryByTenant,
  getServicePackagesByTenant as getMockServicePackagesByTenant,
  getServicesByTenant as getMockServicesByTenant,
} from '../mock/servicesRepository.js';

const CATEGORY_STATUS_LABELS = {
  active: 'Ativo',
  inactive: 'Inativo',
  internal: 'Somente interno',
};

const SERVICE_STATUS_LABELS = {
  active: 'Ativo',
  review: 'Em revisão',
  internal: 'Somente interno',
  inactive: 'Inativo',
};

const PACKAGE_STATUS_LABELS = {
  active: 'Ativo',
  inactive: 'Inativo',
};

const PRICE_TYPE_LABELS = {
  fixed: 'Valor fixo',
  starting_at: 'A partir de',
  on_evaluation: 'Sob avaliação',
  hidden: 'Não exibir',
};

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const getFallbackCatalog = (tenantId) => ({
  services: getMockServicesByTenant(tenantId),
  categories: getMockServiceCategoriesByTenant(tenantId),
  packages: getMockServicePackagesByTenant(tenantId),
  history: getMockServiceHistoryByTenant(tenantId),
});

const mapCategory = (category) => ({
  id: category.id,
  tenant_id: category.tenant_id,
  name: category.name,
  description: category.description || '',
  color: category.color || 'bg-blue-100 text-blue-700',
  icon: category.icon || 'Layers',
  status: CATEGORY_STATUS_LABELS[category.status] || category.status || 'Ativo',
  serviceCount: 0,
  created_at: category.created_at,
  updated_at: category.updated_at,
});

const mapService = (service) => ({
  id: service.id,
  tenant_id: service.tenant_id,
  category_id: service.category_id,
  name: service.name,
  shortDesc: service.short_description || '',
  landingDesc: service.landing_description || '',
  priceType: PRICE_TYPE_LABELS[service.price_type] || service.price_type || 'Valor fixo',
  priceVisual: service.price_amount === null ? null : Number(service.price_amount),
  duration: service.duration_minutes,
  responsible: service.responsible_label || '',
  showOnHome: Boolean(service.show_on_home),
  useInAgenda: Boolean(service.use_in_agenda),
  useInBudget: Boolean(service.use_in_budget),
  useInMarketing: Boolean(service.use_in_marketing),
  status: SERVICE_STATUS_LABELS[service.status] || service.status || 'Ativo',
  created_at: service.created_at,
  updated_at: service.updated_at,
});

const mapPackage = (servicePackage) => {
  const packageItems = servicePackage.service_package_items || [];

  return {
    id: servicePackage.id,
    tenant_id: servicePackage.tenant_id,
    name: servicePackage.name,
    services: packageItems
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => item.service_id),
    priceVisual: servicePackage.price_amount === null ? null : Number(servicePackage.price_amount),
    status: PACKAGE_STATUS_LABELS[servicePackage.status] || servicePackage.status || 'Ativo',
    primaryUse: servicePackage.primary_use || '',
    campaigns: servicePackage.campaigns_count || 0,
    description: servicePackage.description || '',
    created_at: servicePackage.created_at,
    updated_at: servicePackage.updated_at,
  };
};

const attachServiceCounts = (categories, services) => {
  const counts = services.reduce((acc, service) => {
    if (!service.category_id) return acc;
    acc[service.category_id] = (acc[service.category_id] || 0) + 1;
    return acc;
  }, {});

  return categories.map((category) => ({
    ...category,
    serviceCount: counts[category.id] || 0,
  }));
};

export const fetchServiceCatalogByTenant = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return getFallbackCatalog(tenantId);
  }

  const [
    categoriesResponse,
    servicesResponse,
    packagesResponse,
  ] = await Promise.all([
    supabase
      .from('service_categories')
      .select('id, tenant_id, name, description, color, icon, status, sort_order, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('services')
      .select(`
        id,
        tenant_id,
        category_id,
        name,
        short_description,
        landing_description,
        price_type,
        price_amount,
        duration_minutes,
        responsible_label,
        show_on_home,
        use_in_agenda,
        use_in_budget,
        use_in_marketing,
        status,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true }),
    supabase
      .from('service_packages')
      .select(`
        id,
        tenant_id,
        name,
        description,
        price_amount,
        status,
        primary_use,
        campaigns_count,
        created_at,
        updated_at,
        service_package_items (
          service_id,
          sort_order
        )
      `)
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true }),
  ]);

  if (categoriesResponse.error || servicesResponse.error || packagesResponse.error) {
    return getFallbackCatalog(tenantId);
  }

  const services = (servicesResponse.data || []).map(mapService);
  const categories = attachServiceCounts((categoriesResponse.data || []).map(mapCategory), services);
  const packages = (packagesResponse.data || []).map(mapPackage);

  if (!services.length && !categories.length && !packages.length) {
    return getFallbackCatalog(tenantId);
  }

  return {
    services,
    categories,
    packages,
    history: getMockServiceHistoryByTenant(tenantId),
  };
};

export const fetchServicesByTenant = async (tenantId) => {
  return (await fetchServiceCatalogByTenant(tenantId)).services;
};

export const fetchServiceCategoriesByTenant = async (tenantId) => {
  return (await fetchServiceCatalogByTenant(tenantId)).categories;
};

export const fetchServicePackagesByTenant = async (tenantId) => {
  return (await fetchServiceCatalogByTenant(tenantId)).packages;
};
