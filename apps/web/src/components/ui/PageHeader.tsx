import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
  titleId?: string;
};

/** Shared semantic page heading. Feature pages keep control of their own actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className = '',
  titleId = 'page-title',
}: PageHeaderProps) {
  return <header className={['page-heading', className].filter(Boolean).join(' ')}>
    {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
    <h1 id={titleId} tabIndex={-1}>{title}</h1>
    {description ? <p>{description}</p> : null}
    {actions}
    {aside}
  </header>;
}
