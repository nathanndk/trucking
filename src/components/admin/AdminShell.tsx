import { useState, type ReactNode } from 'react';
import { createAuthClient } from 'better-auth/react';
import {
  Building2,
  ChevronsUpDown,
  ExternalLink,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Package,
  Settings,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const authClient = createAuthClient();

export type AdminCounts = {
  services: number;
  projects: number;
  clients: number;
  articles: number;
  /** Quote requests nobody has followed up yet. */
  newInquiries: number;
};
type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  count?: keyof AdminCounts;
  /** Shown as a highlighted marker rather than a plain number. */
  attention?: boolean;
};
const groups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Website',
    items: [
      { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
      { href: '/admin/text', label: 'Page text', Icon: Type },
      { href: '/admin/settings', label: 'Settings', Icon: Settings },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/services', label: 'Services', Icon: Package, count: 'services' },
      { href: '/admin/projects', label: 'Projects', Icon: FolderKanban, count: 'projects' },
      { href: '/admin/clients', label: 'Clients', Icon: Building2, count: 'clients' },
      { href: '/admin/articles', label: 'Articles', Icon: Newspaper, count: 'articles' },
    ],
  },
  {
    label: 'Requests',
    items: [
      {
        href: '/admin/inquiries',
        label: 'Inquiries',
        Icon: Inbox,
        count: 'newInquiries',
        attention: true,
      },
    ],
  },
];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

/** The admin frame: navy sidebar, header with breadcrumb, and the page content. */
export default function AdminShell({
  title,
  description,
  pathname,
  user,
  companyName,
  mark,
  counts,
  children,
}: {
  title: string;
  description: string;
  pathname: string;
  user?: { name: string; email: string };
  companyName: string;
  /** Square brand mark shown at the top of the sidebar. */
  mark: string;
  counts: AdminCounts;
  children?: ReactNode;
}) {
  const [leaving, setLeaving] = useState(false);
  async function signOut() {
    setLeaving(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      window.location.assign('/admin/login');
    } catch {
      toast.error('Sign out failed. Try again.');
      setLeaving(false);
    }
  }
  const name = user?.name || 'Administrator';
  return (
    <SidebarProvider>
      <Toaster richColors position="top-right" />
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip={companyName}>
                <a href="/admin" aria-label={`${companyName}, admin overview`}>
                  <img src={mark} alt="" className="size-8 shrink-0" />
                  <span className="grid leading-tight">
                    <span className="truncate font-semibold text-white">{companyName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      Website admin
                    </span>
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map(({ href, label, Icon, count, attention }) => {
                    const value = count ? counts[count] : undefined;
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton asChild isActive={pathname === href} tooltip={label}>
                          <a href={href} aria-current={pathname === href ? 'page' : undefined}>
                            <Icon />
                            <span>{label}</span>
                          </a>
                        </SidebarMenuButton>
                        {value !== undefined && (!attention || value > 0) && (
                          <SidebarMenuBadge
                            className={
                              attention
                                ? 'rounded-full bg-[var(--mint)] px-1.5 text-[var(--navy)] peer-hover/menu-button:text-[var(--navy)] peer-data-[active=true]/menu-button:text-[var(--navy)]'
                                : 'text-sidebar-foreground/60'
                            }
                          >
                            {value}
                            {attention && <span className="sr-only"> new</span>}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" aria-label={`Account menu for ${name}`}>
                    <Avatar className="size-8 rounded-md">
                      <AvatarFallback className="rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                        {initials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-medium text-white">{name}</span>
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        {user?.email}
                      </span>
                    </span>
                    <ChevronsUpDown className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="min-w-56">
                  <DropdownMenuLabel className="font-normal text-muted-foreground">
                    Signed in as {user?.email || name}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <a href="/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink />
                        View website
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={leaving} onSelect={() => void signOut()}>
                      <LogOut />
                      {leaving ? 'Signing out…' : 'Sign out'}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0 bg-[var(--mist)]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:block">
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button asChild variant="outline" size="sm">
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink data-icon="inline-start" />
              <span className="max-sm:sr-only">View website</span>
            </a>
          </Button>
        </header>
        <div id="admin-content" className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-8">
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="admin-title text-2xl md:text-3xl">{title}</h1>
            <p className="max-w-[70ch] text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
