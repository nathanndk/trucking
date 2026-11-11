import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type NavLink = {
  href: string;
  label: string;
  current: boolean;
  /** Pages listed in a panel under the link. The link itself still opens `href`. */
  menu?: { all: string; items: { href: string; title: string; text: string }[] };
};
type Language = { code: string; name: string; locale: string; href: string; current: boolean };
/** A direct way to reach the company. Only the ones filled in under Settings are passed. */
type Contact = { kind: 'whatsapp' | 'phone' | 'email'; label: string; value: string; href: string };

// Top-level links drop the menu's own hover fill: the ribbed bar under the link (global.css,
// .nav-link) marks hover and the current page instead.
const linkClass =
  'nav-link relative flex h-10 flex-row items-center gap-1 rounded-sm bg-transparent px-3 text-[15px] font-medium text-foreground/75 outline-none transition-colors hover:bg-transparent hover:text-foreground focus:bg-transparent focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[active=true]:bg-transparent data-[active=true]:text-foreground data-[active=true]:hover:bg-transparent data-[active=true]:focus:bg-transparent data-[state=open]:text-foreground aria-[current=page]:text-foreground';

const contactIcons: Record<Contact['kind'], LucideIcon> = {
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
};

/** ID | EN as one segmented control. Plain links, so the switch works before hydration. */
function Languages({
  languages,
  label,
  className,
}: {
  languages: Language[];
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('nav-languages', className)}>
      {languages.map((language) => (
        <a
          key={language.locale}
          href={language.href}
          hrefLang={language.locale}
          lang={language.locale}
          aria-label={language.name}
          aria-current={language.current ? 'true' : undefined}
        >
          {language.code}
        </a>
      ))}
    </div>
  );
}

/**
 * Public header. Rendered on the server and usable as plain links. On large screens a navy
 * strip with the direct contacts and the language switch sits above the bar and scrolls away,
 * while the bar with the quote button stays pinned. The current page is marked with a small
 * ribbed container under its link. Once hydrated, the Services link opens a panel listing each
 * service, and on smaller screens the navigation moves into a sheet.
 */
export default function SiteHeader({
  brand,
  nav,
  languages,
  contacts,
  cta,
  labels,
}: {
  brand: { name: string; logo?: string; href: string; label: string };
  nav: NavLink[];
  languages: Language[];
  contacts: Contact[];
  cta: { href: string; label: string };
  labels: {
    main: string;
    open: string;
    close: string;
    mobile: string;
    language: string;
    contact: string;
  };
}) {
  // The pinned bar gains a shadow once the page has moved under it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 48);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const logo = (
    <a href={brand.href} className="brand" aria-label={`${brand.name}, ${brand.label}`}>
      {brand.logo ? (
        <img className="brand-logo" src={brand.logo} alt="" />
      ) : (
        <span className="brand-word">{brand.name}</span>
      )}
    </a>
  );
  return (
    <header className="navbar" data-scrolled={scrolled || undefined}>
      <div className="nav-strip dark">
        <div className="wrap nav-strip-inner">
          <ul className="nav-contacts">
            {contacts.map((contact) => {
              const Icon = contactIcons[contact.kind];
              return (
                <li key={contact.kind}>
                  <a
                    href={contact.href}
                    aria-label={`${contact.label} ${contact.value}`}
                    {...(contact.kind === 'whatsapp' ? { rel: 'noopener noreferrer' } : {})}
                  >
                    <Icon aria-hidden="true" />
                    {contact.value}
                  </a>
                </li>
              );
            })}
          </ul>
          <Languages languages={languages} label={labels.language} className="nav-actions" />
        </div>
      </div>
      <div className="nav-bar">
        <div className="wrap nav-inner">
          {logo}
          <NavigationMenu className="desktop-nav" aria-label={labels.main} viewport={false}>
            <NavigationMenuList className="gap-0">
              {nav.slice(1).map((item) => (
                <NavigationMenuItem key={item.href}>
                  {item.menu && item.menu.items.length > 0 ? (
                    <>
                      {/* A link, not a button: pointing at it opens the panel, clicking it
                          opens the page, so nothing is lost before or without JavaScript. */}
                      <NavigationMenuPrimitive.Trigger asChild>
                        <a
                          href={item.href}
                          aria-current={item.current ? 'page' : undefined}
                          className={cn(linkClass, 'group')}
                        >
                          {item.label}
                          <ChevronDown
                            aria-hidden="true"
                            className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
                          />
                        </a>
                      </NavigationMenuPrimitive.Trigger>
                      <NavigationMenuContent>
                        <ul className="services-menu grid w-72 gap-1 lg:w-[34rem] lg:grid-cols-2">
                          {item.menu.items.map((entry) => (
                            <li key={entry.href}>
                              <NavigationMenuLink asChild>
                                <a href={entry.href}>
                                  <span className="leading-snug font-semibold">{entry.title}</span>
                                  <span className="line-clamp-2 text-muted-foreground">
                                    {entry.text}
                                  </span>
                                </a>
                              </NavigationMenuLink>
                            </li>
                          ))}
                          <li className="flex items-end">
                            <NavigationMenuLink asChild>
                              <a
                                href={item.href}
                                className="w-full flex-row items-center font-semibold text-primary"
                              >
                                {item.menu.all}
                                <ArrowRight aria-hidden="true" className="text-primary" />
                              </a>
                            </NavigationMenuLink>
                          </li>
                        </ul>
                      </NavigationMenuContent>
                    </>
                  ) : (
                    <NavigationMenuLink asChild active={item.current} className={linkClass}>
                      <a href={item.href} aria-current={item.current ? 'page' : undefined}>
                        {item.label}
                      </a>
                    </NavigationMenuLink>
                  )}
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <div className="nav-end">
            <Button asChild size="lg" className="nav-cta max-lg:h-9 max-lg:px-4">
              <a href={cta.href}>{cta.label}</a>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="mobile-nav-trigger"
                  aria-label={labels.open}
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                showCloseButton={false}
                className="mobile-sheet w-full gap-0 overflow-y-auto sm:max-w-sm"
              >
                <SheetHeader className="flex-row items-center justify-between border-b px-5 py-4">
                  <SheetTitle className="sr-only">{brand.name}</SheetTitle>
                  <SheetDescription className="sr-only">{labels.mobile}</SheetDescription>
                  {brand.logo ? (
                    <img className="h-9 w-auto" src={brand.logo} alt="" />
                  ) : (
                    <span className="brand-word">{brand.name}</span>
                  )}
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" aria-label={labels.close}>
                      <X />
                    </Button>
                  </SheetClose>
                </SheetHeader>
                <nav aria-label={labels.mobile} className="mobile-nav">
                  <ul>
                    {nav.map((item) => (
                      <li key={item.href}>
                        <SheetClose asChild>
                          <a
                            href={item.href}
                            className="mobile-nav-link"
                            aria-current={item.current ? 'page' : undefined}
                          >
                            {item.label}
                          </a>
                        </SheetClose>
                        {item.menu && item.menu.items.length > 0 && (
                          <ul className="mobile-nav-sub">
                            {item.menu.items.map((entry) => (
                              <li key={entry.href}>
                                <SheetClose asChild>
                                  <a href={entry.href}>{entry.title}</a>
                                </SheetClose>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
                {contacts.length > 0 && (
                  <>
                    <Separator />
                    <div className="mobile-contacts">
                      <p>{labels.contact}</p>
                      <ul>
                        {contacts.map((contact) => {
                          const Icon = contactIcons[contact.kind];
                          return (
                            <li key={contact.kind}>
                              <a href={contact.href}>
                                <Icon aria-hidden="true" />
                                <span>
                                  <span className="block text-xs text-muted-foreground">
                                    {contact.label}
                                  </span>
                                  {contact.value}
                                </span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                )}
                <div className="sticky bottom-0 mt-auto flex flex-col gap-4 border-t bg-background px-5 py-4">
                  <Languages languages={languages} label={labels.language} />
                  <Button asChild size="lg" className="w-full">
                    <a href={cta.href}>{cta.label}</a>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
