import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type NavLink = { href: string; label: string; current: boolean };
type Language = { code: string; name: string; locale: string; href: string; current: boolean };

/**
 * Public header. Rendered on the server; hydrated only on small screens, where the
 * navigation moves into a sheet that needs JavaScript to open.
 */
export default function SiteHeader({
  brand,
  nav,
  languages,
  cta,
  labels,
}: {
  brand: { name: string; logo?: string; href: string; label: string };
  nav: NavLink[];
  languages: Language[];
  cta: { href: string; label: string };
  labels: { main: string; open: string; mobile: string; language: string };
}) {
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
    <header className="navbar">
      <div className="wrap nav-inner">
        {logo}
        <NavigationMenu
          className="desktop-nav max-md:hidden"
          aria-label={labels.main}
          viewport={false}
        >
          <NavigationMenuList>
            {nav.slice(1).map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink
                  asChild
                  active={item.current}
                  className={navigationMenuTriggerStyle()}
                >
                  <a href={item.href} aria-current={item.current ? 'page' : undefined}>
                    {item.label}
                  </a>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="nav-actions max-md:hidden">
          <div role="group" aria-label={labels.language} className="flex items-center gap-1">
            {languages.map((language) => (
              <Button
                key={language.locale}
                asChild
                size="sm"
                variant={language.current ? 'secondary' : 'ghost'}
              >
                <a
                  href={language.href}
                  hrefLang={language.locale}
                  lang={language.locale}
                  aria-label={language.name}
                  aria-current={language.current ? 'true' : undefined}
                >
                  {language.code}
                </a>
              </Button>
            ))}
          </div>
          <Button asChild size="lg" className="nav-cta max-lg:hidden">
            <a href={cta.href}>{cta.label}</a>
          </Button>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              className="mobile-nav-trigger md:hidden"
              aria-label={labels.open}
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{brand.name}</SheetTitle>
              <SheetDescription className="sr-only">{labels.mobile}</SheetDescription>
            </SheetHeader>
            <nav aria-label={labels.mobile} className="flex flex-col gap-1 px-4">
              {nav.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant={item.current ? 'secondary' : 'ghost'}
                  className="justify-start"
                >
                  <a href={item.href} aria-current={item.current ? 'page' : undefined}>
                    {item.label}
                  </a>
                </Button>
              ))}
            </nav>
            <Separator />
            <div role="group" aria-label={labels.language} className="flex flex-col gap-1 px-4">
              {languages.map((language) => (
                <Button
                  key={language.locale}
                  asChild
                  variant={language.current ? 'secondary' : 'ghost'}
                  className="justify-start"
                >
                  <a
                    href={language.href}
                    lang={language.locale}
                    aria-current={language.current ? 'true' : undefined}
                  >
                    {language.name}
                  </a>
                </Button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <Button asChild size="lg" className="w-full">
                <a href={cta.href}>{cta.label}</a>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
