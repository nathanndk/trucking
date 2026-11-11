/**
 * What search engines read besides the visible page: schema.org data (JSON-LD) and the text of
 * the search result. Everything here is built from data the site already shows; fields the
 * company has not filled in under Settings are left out, never guessed.
 */
export type SchemaNode = Record<string, unknown>;

type Company = {
  legalName: string;
  companyName: string;
  shortDescription: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  instagram?: string;
  linkedin?: string;
};

const absolute = (target: string, origin: string) => new URL(target, origin).href;
/** The company is described once per page; other nodes point at it by this id. */
export const organizationId = (origin: string) => `${origin}/#organization`;
const websiteId = (origin: string) => `${origin}/#website`;

/** A JSON-LD script body. `<` is escaped so text can never close the script element. */
export function jsonLd(node: SchemaNode): string {
  return JSON.stringify({ '@context': 'https://schema.org', ...node }).replaceAll('<', '\\u003c');
}

export function organizationSchema(s: Company, origin: string): SchemaNode {
  const sameAs = [s.instagram, s.linkedin].filter(Boolean);
  return {
    '@type': 'Organization',
    '@id': organizationId(origin),
    name: s.legalName,
    alternateName: s.companyName,
    url: origin,
    description: s.shortDescription,
    areaServed: { '@type': 'City', name: 'Jakarta' },
    ...(s.logo ? { logo: absolute(s.logo, origin) } : {}),
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.email ? { email: s.email } : {}),
    ...(s.address ? { address: s.address } : {}),
    ...(s.phone || s.email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            availableLanguage: ['id', 'en'],
            ...(s.phone ? { telephone: s.phone } : {}),
            ...(s.email ? { email: s.email } : {}),
          },
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function websiteSchema(s: Company, origin: string, language: string): SchemaNode {
  return {
    '@type': 'WebSite',
    '@id': websiteId(origin),
    name: s.companyName,
    url: origin,
    inLanguage: language,
    publisher: { '@id': organizationId(origin) },
  };
}

/** The trail shown above the page title, from Home down to the page itself. */
export function breadcrumbSchema(trail: { name: string; url: string }[]): SchemaNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function serviceSchema(
  service: { title: string; description: string; image?: string },
  url: string,
  origin: string,
): SchemaNode {
  return {
    '@type': 'Service',
    name: service.title,
    serviceType: service.title,
    description: service.description,
    url,
    provider: { '@id': organizationId(origin) },
    areaServed: { '@type': 'City', name: 'Jakarta' },
    ...(service.image ? { image: absolute(service.image, origin) } : {}),
  };
}

export function articleSchema(
  article: { title: string; description: string; image?: string; published: Date; modified: Date },
  url: string,
  origin: string,
): SchemaNode {
  return {
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url,
    mainEntityOfPage: url,
    datePublished: article.published.toISOString(),
    dateModified: article.modified.toISOString(),
    author: { '@id': organizationId(origin) },
    publisher: { '@id': organizationId(origin) },
    ...(article.image ? { image: absolute(article.image, origin) } : {}),
  };
}

/**
 * Text for a search result: one line, cut at a word when it runs past what Google shows.
 */
export function clip(text: string, max = 155): string {
  const line = text.replace(/\s+/g, ' ').trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).replace(/[\s,;:.-]+$/, '')}…`;
}
