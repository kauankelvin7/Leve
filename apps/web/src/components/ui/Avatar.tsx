import { useEffect, useState } from 'react';

type AvatarProps = {
  name: string;
  seed?: string;
  className?: string;
  decorative?: boolean;
};

let diceBear: Promise<(seed: string) => string> | null = null;

function renderer() {
  diceBear ??= Promise.all([import('@dicebear/core'), import('@dicebear/avataaars')]).then(([core, style]) =>
    (seed: string) => core.createAvatar(style, {
      seed,
      size: 128,
      radius: 22,
      backgroundColor: ['dfe9df', 'f3dfd4', 'e4deef', 'dce8f2'],
    }).toDataUri(),
  );
  return diceBear;
}

export function Avatar({ name, seed, className = '', decorative = false }: AvatarProps) {
  const [source, setSource] = useState('');

  useEffect(() => {
    let current = true;
    if (!seed) { setSource(''); return () => { current = false; }; }
    void renderer().then(render => { if (current) setSource(render(seed)); });
    return () => { current = false; };
  }, [seed]);

  const label = decorative ? undefined : `Avatar de ${name}`;
  return <span className={`avatar ${className}`.trim()} role={decorative ? undefined : 'img'} aria-label={label} aria-hidden={decorative || undefined}>
    {source ? <img src={source} alt="" /> : <span aria-hidden="true">{name.slice(0, 1).toLocaleUpperCase('pt-BR')}</span>}
  </span>;
}
