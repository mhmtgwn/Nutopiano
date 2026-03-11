const BACKOFFICE_PREFIXES = [
  '/account',
  '/admin',
  '/dashboard',
  '/forbidden',
  '/panel',
  '/platform',
  '/pos',
];

export function isBackofficePath(pathname?: string | null) {
  if (!pathname) return false;

  return BACKOFFICE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
