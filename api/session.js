import { json, isAuthenticated } from './_lib/http.js';
export default async function handler(req, res) {
  return json(res, 200, { authenticated: isAuthenticated(req), passwordRequired: !!process.env.APP_PASSWORD });
}
