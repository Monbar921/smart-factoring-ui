/** Access token как от Keycloak (без подписи) с заданными ролями realm */
export function testToken(...roles: string[]): string {
  const payload = btoa(JSON.stringify({ preferred_username: 'tester', realm_access: { roles } }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `e30.${payload}.signature`;
}
