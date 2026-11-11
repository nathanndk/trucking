export const collections = [
  'services',
  'fleet',
  'coverage',
  'projects',
  'clients',
  'articles',
] as const;
export type Collection = (typeof collections)[number];
/** Upload folders. The single source for validation, storage and the upload action. */
export const mediaFolders = [
  'fleet',
  'services',
  'projects',
  'clients',
  'articles',
  'general',
] as const;
export type Field = {
  name: string;
  label: string;
  type?: 'textarea' | 'number' | 'url';
  required?: boolean;
};
export const contentConfig: Record<
  Collection,
  {
    label: string;
    singular: string;
    description: string;
    fields: Field[];
    image: boolean;
    /** false keeps the collection in the CMS but off the public website. */
    public: boolean;
  }
> = {
  services: {
    label: 'Services',
    singular: 'service',
    description: 'Manage the services your customers can explore.',
    image: true,
    public: true,
    fields: [],
  },
  fleet: {
    label: 'Fleet',
    singular: 'vehicle',
    description: 'Vehicle options and capacities. Not shown on the public website yet.',
    image: true,
    public: false,
    fields: [
      { name: 'vehicleType', label: 'Vehicle type', required: true },
      { name: 'capacity', label: 'Capacity', required: true },
      { name: 'specifications', label: 'Specifications', type: 'textarea' },
    ],
  },
  coverage: {
    label: 'Coverage',
    singular: 'service area',
    description: 'Operational cities and provinces. Not shown on the public website yet.',
    image: false,
    public: false,
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
    public: true,
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
    public: true,
    fields: [{ name: 'website', label: 'Website (optional)', type: 'url' }],
  },
  articles: {
    label: 'Articles',
    singular: 'article',
    description: 'Publish company news and articles. Newest articles appear first.',
    image: true,
    public: true,
    fields: [],
  },
};
export type ContentRecord = {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  titleEn: string;
  shortDescriptionEn: string;
  descriptionEn: string;
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
  { name: 'established', label: 'Year established' },
  { name: 'phone', label: 'Phone' },
  { name: 'whatsapp', label: 'WhatsApp (international digits)' },
  { name: 'email', label: 'Email' },
  { name: 'address', label: 'Office address', type: 'textarea' },
  { name: 'mapsUrl', label: 'Google Maps URL', type: 'url' },
  { name: 'instagram', label: 'Instagram URL', type: 'url' },
  { name: 'linkedin', label: 'LinkedIn URL', type: 'url' },
  { name: 'ctaText', label: 'Primary CTA text', required: true },
  { name: 'credentials', label: 'Verified credentials (one per line)', type: 'textarea' },
];
/** English versions. A blank value falls back to the Indonesian text on /en pages. */
export const settingFieldsEn: Field[] = [
  { name: 'taglineEn', label: 'English tagline' },
  { name: 'ctaTextEn', label: 'English CTA text' },
  { name: 'shortDescriptionEn', label: 'English short description', type: 'textarea' },
  { name: 'aboutEn', label: 'English about text', type: 'textarea' },
  { name: 'visionEn', label: 'English vision', type: 'textarea' },
  { name: 'missionEn', label: 'English mission (one per line)', type: 'textarea' },
  { name: 'credentialsEn', label: 'English credentials (one per line)', type: 'textarea' },
];
