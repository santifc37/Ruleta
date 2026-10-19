export default function middleware(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tieneToken = cookieHeader.includes('token_sesion=');

  if (!tieneToken) {
    return Response.redirect(new URL('/', request.url));
  }

  return new Response(null, {
    headers: { 'x-middleware-next': '1' }
  });
}

export const config = {
  matcher: '/killer/:path*',
};