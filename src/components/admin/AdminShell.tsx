import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  Building2,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Newspaper,
  Package,
  Settings,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Logout from './Logout';

const links = [
  { href: '/admin', label: 'Overview', Icon: LayoutDashboard },
  { href: '/admin/services', label: 'Services', Icon: Package },
  { href: '/admin/projects', label: 'Projects', Icon: FolderKanban },
  { href: '/admin/clients', label: 'Clients', Icon: Building2 },
  { href: '/admin/articles', label: 'Articles', Icon: Newspaper },
  { href: '/admin/inquiries', label: 'Inquiries', Icon: Inbox },
  { href: '/admin/settings', label: 'Settings', Icon: Settings },
];

/** The admin frame: shadcn sidebar, header with breadcrumb, and the page content. */
export default function AdminShell({
  title,
  description,
  pathname,
  userName,
  companyName,
  logo,
  children,
}: {
  title: string;
  description: string;
  pathname: string;
  userName?: string;
  companyName: string;
  logo?: string;
  children?: ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <a
            href="/admin"
            aria-label={`${companyName}, admin overview`}
            className="flex h-12 items-center px-2"
          >
            {logo ? (
              <img src={logo} alt="" className="h-10 w-auto" />
            ) : (
              <span className="font-semibold">{companyName}</span>
            )}
          </a>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map(({ href, label, Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={pathname === href}>
                      <a href={href} aria-current={pathname === href ? 'page' : undefined}>
                        <Icon />
                        <span>{label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="/">
                  <ArrowUpRight />
                  <span>View website</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-muted/40">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:block">
                <BreadcrumbLink href="/admin">Workspace</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {userName && (
            <span className="hidden text-xs text-muted-foreground sm:block">{userName}</span>
          )}
          <Logout />
        </header>
        <div id="admin-content" className="mx-auto w-full max-w-[1500px] flex-1 p-4 md:p-8">
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
