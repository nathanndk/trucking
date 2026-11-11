export const collections = ['services', 'projects', 'clients', 'articles'] as const;
export type Collection = (typeof collections)[number];
/** Upload folders. The single source for validation, storage and the upload action. */
export const mediaFolders = ['services', 'projects', 'clients', 'articles', 'general'] as const;
export type Field = {
  name: string;
  label: string;
  type?: 'textarea' | 'url';
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
  }
> = {
  services: {
    label: 'Services',
    singular: 'service',
    description: 'Manage the services your customers can explore.',
    image: true,
    fields: [],
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
  articles: {
    label: 'Articles',
    singular: 'article',
    description: 'Publish company news and articles. Newest articles appear first.',
    image: true,
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
  clientName?: string;
  projectYear?: string;
  website?: string;
};
/** Settings screen: plain company details, one card per section. */
export const settingSections: { title: string; description: string; fields: Field[] }[] = [
  {
    title: 'Company',
    description: 'Names and facts about the company. Fields marked * are required.',
    fields: [
      { name: 'companyName', label: 'Company name', required: true },
      { name: 'legalName', label: 'Legal company name', required: true },
      { name: 'established', label: 'Year established' },
    ],
  },
  {
    title: 'Contact',
    description: 'Details left blank show as “to be updated” on the website.',
    fields: [
      { name: 'whatsapp', label: 'WhatsApp (international digits)' },
      { name: 'phone', label: 'Phone' },
      { name: 'email', label: 'Email' },
      { name: 'mapsUrl', label: 'Google Maps URL', type: 'url' },
      { name: 'address', label: 'Office address', type: 'textarea' },
      { name: 'instagram', label: 'Instagram URL', type: 'url' },
      { name: 'linkedin', label: 'LinkedIn URL', type: 'url' },
    ],
  },
];
/**
 * Company wording, Indonesian and English side by side. A blank English text falls back
 * to the Indonesian one on /en pages.
 */
export const settingTextPairs: [Field, Field][] = [
  [
    { name: 'tagline', label: 'Tagline', required: true },
    { name: 'taglineEn', label: 'English tagline' },
  ],
  [
    { name: 'ctaText', label: 'Primary CTA text', required: true },
    { name: 'ctaTextEn', label: 'English CTA text' },
  ],
  [
    { name: 'shortDescription', label: 'Short description', type: 'textarea', required: true },
    { name: 'shortDescriptionEn', label: 'English short description', type: 'textarea' },
  ],
  [
    { name: 'about', label: 'About the company', type: 'textarea', required: true },
    { name: 'aboutEn', label: 'English about text', type: 'textarea' },
  ],
  [
    { name: 'vision', label: 'Vision', type: 'textarea', required: true },
    { name: 'visionEn', label: 'English vision', type: 'textarea' },
  ],
  [
    { name: 'mission', label: 'Mission (one per line)', type: 'textarea', required: true },
    { name: 'missionEn', label: 'English mission (one per line)', type: 'textarea' },
  ],
  [
    { name: 'credentials', label: 'Verified credentials (one per line)', type: 'textarea' },
    { name: 'credentialsEn', label: 'English credentials (one per line)', type: 'textarea' },
  ],
];
