// _routes.json limits invocation to API paths, including malformed ones without a file route.
export { onRequest } from './api/[[path]].js';
