/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    admin: { id: string; name: string; email: string; role: string } | null;
    /** Fields of a quote form post, read before the action runs, to refill the form on error. */
    quoteSubmitted?: import('./lib/quote-refill').QuoteValues;
  }
}
