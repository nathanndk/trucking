/**
 * The editable wording of the public website, laid out the way the Page text screen in the
 * admin shows it: page → section → field. Each key is a path into the dictionaries in
 * src/i18n. A unit test checks that every dictionary text appears here exactly once.
 */
export type CopyField = {
  key: string;
  label: string;
  /** Longer text gets a textarea. */
  multiline?: boolean;
  /** Extra guidance shown under the field. */
  hint?: string;
};
export type CopySection = {
  title: string;
  /** Where related wording lives when it is not on this screen. */
  note?: string;
  /** Admin screen the note points to. */
  link?: { href: string; label: string };
  fields: CopyField[];
};
export type CopyPage = {
  id: string;
  title: string;
  /** Public path of the page, for the "View page" link. */
  href?: string;
  sections: CopySection[];
};

const keep = (name: string) => `Keep {${name}} in the text: it is replaced automatically.`;
/** Numbered list entries: a title and a text per item. */
const items = (path: string, noun: string, count: number): CopyField[] =>
  Array.from({ length: count }, (_, i) => [
    { key: `${path}.${i}.title`, label: `${noun} ${i + 1} title` },
    { key: `${path}.${i}.text`, label: `${noun} ${i + 1} text`, multiline: true },
  ]).flat();
const pageHeader = (page: string, extra: CopyField[] = []): CopySection => ({
  title: 'Page header',
  fields: [
    { key: `${page}.title`, label: 'Browser tab title' },
    { key: `${page}.h1`, label: 'Main heading' },
    ...extra,
  ],
});

export const copyPages: CopyPage[] = [
  {
    id: 'home',
    title: 'Home',
    href: '/',
    sections: [
      {
        title: 'Hero',
        note: 'The tagline, description and main button text come from Settings → Company text.',
        link: { href: '/admin/settings', label: 'Open Settings' },
        fields: [
          { key: 'home.title', label: 'Browser tab title' },
          { key: 'home.h1', label: 'Main heading' },
          { key: 'home.servicesLink', label: 'Secondary button' },
          { key: 'home.heroAlt', label: 'Photo description' },
        ],
      },
      {
        title: 'Quick quote (in the hero)',
        note: 'The service and container names in the two lists come from Services and from Container sizes below.',
        fields: [
          { key: 'quick.heading', label: 'Heading' },
          { key: 'quick.service', label: 'Service field' },
          { key: 'quick.container', label: 'Container field' },
          { key: 'quick.containerPlaceholder', label: 'Container field, nothing chosen' },
          { key: 'quick.submit', label: 'Button' },
        ],
      },
      {
        title: 'Shipping route',
        fields: [
          { key: 'route.heading', label: 'Section name (screen readers)' },
          ...items('route.stops', 'Step', 4),
        ],
      },
      {
        title: 'About the company',
        note: 'The paragraph is the first paragraph of the profile in Settings → Company text.',
        link: { href: '/admin/settings', label: 'Open Settings' },
        fields: [
          { key: 'home.aboutHeading', label: 'Heading' },
          { key: 'home.aboutLink', label: 'Link text' },
          { key: 'home.aboutAlt', label: 'Photo description' },
        ],
      },
      {
        title: 'Strengths (also on About)',
        note: 'On Home, strength 1 is drawn with the two container sizes and strength 2 with the route to the port.',
        fields: [
          { key: 'strengths.heading', label: 'Heading' },
          ...items('strengths.items', 'Strength', 5),
        ],
      },
      {
        title: 'Services',
        note: 'Service names and descriptions are edited under Services.',
        link: { href: '/admin/services', label: 'Open Services' },
        fields: [
          { key: 'home.servicesHeading', label: 'Heading' },
          { key: 'home.servicesAll', label: 'Link text' },
        ],
      },
      {
        title: 'Container sizes (also on Services and the quote form)',
        fields: [
          { key: 'container.heading', label: 'Heading' },
          { key: 'container.text', label: 'Text', multiline: true },
          { key: 'container.note', label: 'Small print', multiline: true },
          { key: 'container.lengthLabel', label: 'Word for "length"' },
          { key: 'container.sizes.20ft.name', label: '20 ft name' },
          { key: 'container.sizes.20ft.length', label: '20 ft length' },
          { key: 'container.sizes.20ft.action', label: '20 ft link description' },
          { key: 'container.sizes.40ft.name', label: '40 ft name' },
          { key: 'container.sizes.40ft.length', label: '40 ft length' },
          { key: 'container.sizes.40ft.action', label: '40 ft link description' },
        ],
      },
      {
        title: 'Operating area (also on About)',
        fields: [
          { key: 'area.heading', label: 'Heading' },
          { key: 'area.main', label: 'Main area label' },
          { key: 'area.mainValue', label: 'Main area' },
          { key: 'area.port', label: 'Main port label' },
          { key: 'area.portValue', label: 'Main port' },
          { key: 'area.other', label: 'Other areas label' },
        ],
      },
      {
        title: 'Common questions',
        fields: [
          { key: 'faq.heading', label: 'Heading' },
          ...Array.from({ length: 6 }, (_, i) => [
            { key: `faq.items.${i}.question`, label: `Question ${i + 1}` },
            { key: `faq.items.${i}.answer`, label: `Answer ${i + 1}`, multiline: true },
          ]).flat(),
        ],
      },
      {
        title: 'Projects and clients',
        fields: [
          { key: 'home.projectsHeading', label: 'Heading' },
          { key: 'home.projectsLink', label: 'Link text' },
          { key: 'home.projectsEmpty', label: 'Text while there are none', multiline: true },
        ],
      },
      {
        title: 'Latest articles',
        fields: [
          { key: 'home.articlesHeading', label: 'Heading' },
          { key: 'home.articlesLink', label: 'Link text' },
          { key: 'home.articlesEmpty', label: 'Text while there are none', multiline: true },
        ],
      },
    ],
  },
  {
    id: 'about',
    title: 'About',
    href: '/about',
    sections: [
      pageHeader('about', [
        {
          key: 'about.description',
          label: 'Search engine description',
          multiline: true,
          hint: keep('name'),
        },
      ]),
      {
        title: 'Profile',
        note: 'The profile text itself is edited in Settings → Company text.',
        link: { href: '/admin/settings', label: 'Open Settings' },
        fields: [
          { key: 'about.profileHeading', label: 'Heading' },
          { key: 'about.imageAlt', label: 'Photo description' },
        ],
      },
      {
        title: 'Vision and mission',
        note: 'The vision and mission texts are edited in Settings → Company text.',
        link: { href: '/admin/settings', label: 'Open Settings' },
        fields: [
          { key: 'about.vision', label: 'Vision heading' },
          { key: 'about.mission', label: 'Mission heading' },
        ],
      },
      {
        title: 'Company details',
        fields: [
          { key: 'about.factsHeading', label: 'Heading' },
          { key: 'about.legalName', label: 'Company name label' },
          { key: 'about.established', label: 'Year established label' },
          { key: 'about.credentials', label: 'Legal credentials label' },
        ],
      },
    ],
  },
  {
    id: 'services',
    title: 'Services',
    href: '/services',
    sections: [
      pageHeader('services', [
        { key: 'services.intro', label: 'Introduction', multiline: true },
        { key: 'services.description', label: 'Search engine description', multiline: true },
      ]),
      {
        title: 'Service cards',
        note: 'Service names and descriptions are edited under Services.',
        link: { href: '/admin/services', label: 'Open Services' },
        fields: [
          { key: 'services.quote', label: 'Quote link (Services page)' },
          { key: 'services.quoteShort', label: 'Quote link (Home)' },
          { key: 'services.empty', label: 'Text while there are none', multiline: true },
        ],
      },
      {
        title: 'How to order',
        fields: [
          { key: 'services.stepsHeading', label: 'Heading' },
          ...items('services.steps', 'Step', 3),
        ],
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    href: '/projects',
    sections: [
      pageHeader('projects', [
        { key: 'projects.intro', label: 'Introduction', multiline: true },
        {
          key: 'projects.description',
          label: 'Search engine description',
          multiline: true,
          hint: keep('name'),
        },
      ]),
      {
        title: 'Projects',
        fields: [
          { key: 'projects.projectsHeading', label: 'Heading' },
          { key: 'projects.projectsEmpty', label: 'Text while there are none', multiline: true },
          { key: 'projects.imageAlt', label: 'Photo description', hint: keep('title') },
        ],
      },
      {
        title: 'Clients and partners',
        fields: [
          { key: 'projects.clientsHeading', label: 'Heading' },
          { key: 'projects.clientsEmpty', label: 'Text while there are none', multiline: true },
        ],
      },
    ],
  },
  {
    id: 'articles',
    title: 'Articles',
    href: '/articles',
    sections: [
      pageHeader('articles', [
        { key: 'articles.intro', label: 'Introduction', multiline: true },
        {
          key: 'articles.description',
          label: 'Search engine description',
          multiline: true,
          hint: keep('name'),
        },
      ]),
      {
        title: 'Article list',
        fields: [
          { key: 'articles.empty', label: 'Text while there are none', multiline: true },
          { key: 'articles.back', label: 'Link back to the list' },
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    href: '/contact',
    sections: [
      pageHeader('contact', [
        { key: 'contact.intro', label: 'Introduction', multiline: true },
        { key: 'contact.description', label: 'Search engine description', multiline: true },
      ]),
      {
        title: 'Contact details',
        note: 'The phone numbers, email and address themselves are edited in Settings → Contact.',
        link: { href: '/admin/settings', label: 'Open Settings' },
        fields: [
          { key: 'contact.infoHeading', label: 'Heading' },
          { key: 'contact.whatsapp', label: 'WhatsApp label' },
          { key: 'contact.phone', label: 'Phone label' },
          { key: 'contact.email', label: 'Email label' },
          { key: 'contact.office', label: 'Office label' },
          { key: 'contact.maps', label: 'Map link text' },
        ],
      },
      {
        title: 'Quote form',
        fields: [
          { key: 'contact.formHeading', label: 'Heading' },
          { key: 'contact.required', label: 'Required fields note' },
          { key: 'contact.fullName', label: 'Full name field' },
          { key: 'contact.company', label: 'Company field' },
          { key: 'contact.phoneField', label: 'WhatsApp field' },
          { key: 'contact.emailField', label: 'Email field' },
          { key: 'contact.serviceType', label: 'Service field' },
          { key: 'contact.servicePlaceholder', label: 'Service field, nothing chosen' },
          { key: 'contact.pickup', label: 'Origin field' },
          { key: 'contact.destination', label: 'Destination field' },
          { key: 'contact.containerType', label: 'Container type field' },
          { key: 'contact.message', label: 'Message field' },
          { key: 'contact.messagePlaceholder', label: 'Message example' },
          { key: 'contact.privacy', label: 'Privacy note', multiline: true },
          { key: 'contact.submit', label: 'Send button' },
        ],
      },
      {
        title: 'Messages after sending',
        fields: [
          { key: 'contact.successTitle', label: 'Success title' },
          { key: 'contact.successText', label: 'Success text', multiline: true },
          {
            key: 'contact.errors.invalid',
            label: 'Error: form filled in wrongly',
            multiline: true,
          },
          { key: 'contact.errors.BAD_REQUEST', label: 'Error: form expired', multiline: true },
          {
            key: 'contact.errors.TOO_MANY_REQUESTS',
            label: 'Error: too many requests',
            multiline: true,
          },
          { key: 'contact.errors.CONFLICT', label: 'Error: sent twice', multiline: true },
          { key: 'contact.errors.generic', label: 'Error: anything else', multiline: true },
        ],
      },
    ],
  },
  {
    id: 'shared',
    title: 'Shared',
    sections: [
      {
        title: 'Navigation',
        fields: [
          { key: 'nav.home', label: 'Home link' },
          { key: 'nav.about', label: 'About link' },
          { key: 'nav.services', label: 'Services link' },
          { key: 'nav.projects', label: 'Projects link' },
          { key: 'nav.articles', label: 'Articles link' },
          { key: 'nav.contact', label: 'Contact link' },
          { key: 'nav.main', label: 'Menu name (screen readers)' },
          { key: 'nav.mobile', label: 'Mobile menu name (screen readers)' },
          { key: 'nav.open', label: 'Open menu button (screen readers)' },
          { key: 'nav.language', label: 'Language switch name (screen readers)' },
          { key: 'nav.brandHome', label: 'Logo link description' },
          { key: 'skip', label: 'Skip link (keyboard users)' },
        ],
      },
      {
        title: 'Call to action band',
        note: 'The button text comes from Settings → Company text.',
        link: { href: '/admin/settings', label: 'Open Settings' },
        fields: [
          { key: 'cta.heading', label: 'Heading' },
          { key: 'cta.text', label: 'Text', multiline: true },
          { key: 'cta.imageAlt', label: 'Photo description' },
        ],
      },
      {
        title: 'Footer',
        fields: [
          { key: 'footer.explore', label: 'Links heading' },
          { key: 'footer.contact', label: 'Contact heading' },
          { key: 'footer.office', label: 'Office heading' },
          { key: 'footer.whatsapp', label: 'WhatsApp label' },
          { key: 'footer.email', label: 'Email label' },
          { key: 'footer.phone', label: 'Phone label' },
        ],
      },
      {
        title: 'Missing information',
        fields: [{ key: 'toBeUpdated', label: 'Marker for details not supplied yet' }],
      },
      {
        title: 'Page not found',
        fields: [
          { key: 'notFound.title', label: 'Browser tab title' },
          { key: 'notFound.h1', label: 'Main heading' },
          { key: 'notFound.text', label: 'Text', multiline: true },
          { key: 'notFound.back', label: 'Button' },
          { key: 'notFound.description', label: 'Search engine description' },
        ],
      },
    ],
  },
];
/** Dictionary entries that are settings for the code, not wording. */
export const technicalKeys = ['htmlLang', 'ogLocale', 'dateLocale'];
export const copyKeys = new Set(
  copyPages.flatMap((page) => page.sections.flatMap((section) => section.fields.map((f) => f.key))),
);
