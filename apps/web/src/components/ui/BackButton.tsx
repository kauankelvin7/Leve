import { Link, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

type BackButtonProps = { to?: string; children?: string; className?: string };
export function BackButton({ to, children = 'Voltar', className = '' }: BackButtonProps) {
  const navigate = useNavigate();
  const classes = `back-link ${className}`.trim();
  if (to) return <Link className={classes} to={to} aria-label={children}><Icon name="chevronLeft" />{children}</Link>;
  return <button type="button" className={classes} onClick={() => navigate(-1)} aria-label={children}><Icon name="chevronLeft" />{children}</button>;
}
