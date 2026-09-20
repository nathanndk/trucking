export const collections = ['services', 'fleet', 'coverage', 'projects', 'clients'] as const;
export type Collection = (typeof collections)[number];
export type Field = {
  name: string;
  label: string;
  type?: 'textarea' | 'number' | 'url';
  required?: boolean;
};
export const contentConfig: Record<
  Collection,
  { label: string; singular: string; description: string; fields: Field[]; image: boolean }
> = {
  services: {
    label: 'Services',
    singular: 'service',
    description: 'Manage the services your customers can explore.',
    image: true,
    fields: [{ name: 'icon', label: 'Icon (Truck, Package, Warehouse, Container)' }],
  },
  fleet: {
    label: 'Fleet',
    singular: 'vehicle',
    description: 'Present vehicle options, capacities, and specifications.',
    image: true,
    fields: [
      { name: 'vehicleType', label: 'Vehicle type', required: true },
      { name: 'capacity', label: 'Capacity', required: true },
      { name: 'specifications', label: 'Specifications', type: 'textarea' },
    ],
  },
  coverage: {
    label: 'Coverage',
    singular: 'service area',
    description: 'Keep your operational cities and provinces up to date.',
    image: false,
    fields: [
      { name: 'province', label: 'Province', required: true },
      { name: 'latitude', label: 'Latitude (optional)', type: 'number' },
      { name: 'longitude', label: 'Longitude (optional)', type: 'number' },
    ],
  },
  projects: {
    label: 'Projects',
    singular: 'project',
    description: 'Share approved project stories and delivery experience.',
    image: true,
    fields: [
      { name: 'clientName', label: 'Client name', required: true },
      { name: 'projectYear', label: 'Project year', required: true },
    ],
  },
  clients: {
    label: 'Clients',
    singular: 'client',
    description: 'Only publish logos you have permission to display.',
    image: true,
    fields: [{ name: 'website', label: 'Website (optional)', type: 'url' }],
  },
};
export type ContentRecord = {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  image: string;
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  icon?: string;
  vehicleType?: string;
  capacity?: string;
  specifications?: string;
  province?: string;
  latitude?: number | null;
  longitude?: number | null;
  clientName?: string;
  projectYear?: string;
  website?: string;
};
export const settingFields: Field[] = [
  { name: 'companyName', label: 'Company name', required: true },
  { name: 'legalName', label: 'Legal company name', required: true },
  { name: 'tagline', label: 'Tagline', required: true },
  { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true },
  { name: 'about', label: 'About the company', type: 'textarea', required: true },
  { name: 'vision', label: 'Vision', type: 'textarea', required: true },
  { name: 'mission', label: 'Mission (one per line)', type: 'textarea', required: true },
  { name: 'established', label: 'Year established', required: true },
  { name: 'phone', label: 'Phone', required: true },
  { name: 'whatsapp', label: 'WhatsApp (international digits)', required: true },
  { name: 'email', label: 'Email', required: true },
  { name: 'address', label: 'Office address', type: 'textarea', required: true },
  { name: 'mapsUrl', label: 'Google Maps URL', type: 'url' },
  { name: 'instagram', label: 'Instagram URL', type: 'url' },
  { name: 'linkedin', label: 'LinkedIn URL', type: 'url' },
  { name: 'ctaText', label: 'Primary CTA text', required: true },
  { name: 'credentials', label: 'Verified credentials (one per line)', type: 'textarea' },
];
