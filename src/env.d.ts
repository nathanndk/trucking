/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    admin: { id: string; name: string; email: string; role: string } | null;
  }
}
