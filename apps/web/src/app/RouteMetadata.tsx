import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PUBLIC_PATHS = new Set(['/entrar', '/registrar', '/recuperar']);

export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const isPublic = PUBLIC_PATHS.has(pathname);
    robots?.setAttribute('content', isPublic ? 'index,follow,max-image-preview:large' : 'noindex,nofollow');
    if (!isPublic) document.title = `${document.title.split(' · ')[0]} · Leve`;
  }, [pathname]);
  return null;
}
