import { useMemo, useState } from 'react';
import { Avatar } from '../../components/ui/Avatar';

const INITIAL_SEEDS = ['leve-aurora', 'leve-bento', 'leve-caju', 'leve-dengo', 'leve-flora', 'leve-jasmim'];

export function AvatarPicker({ name, value, onChange }: { name: string; value?: string; onChange: (seed: string) => void }) {
  const [batch, setBatch] = useState(() => value?.match(/^leve-([^-]+)-[1-6]$/)?.[1] ?? 'inicial');
  const options = useMemo(() => {
    const generated = batch === 'inicial' ? INITIAL_SEEDS : Array.from({ length: 6 }, (_, index) => `leve-${batch}-${index + 1}`);
    return value && !generated.includes(value) ? [...generated.slice(0, 5), value] : generated;
  }, [batch, value]);

  function refresh() {
    const next = crypto.randomUUID().slice(0, 8);
    setBatch(next);
    onChange(`leve-${next}-1`);
  }

  return <fieldset className="avatar-picker">
    <legend>Seu avatar</legend>
    <div className="avatar-picker-heading">
      <p>Escolha um rosto para deixar seu perfil com a sua cara. Você pode trocar quando quiser.</p>
      <button type="button" onClick={refresh}>Ver outras opções</button>
    </div>
    <div className="avatar-options" role="radiogroup" aria-label="Escolha do avatar">
      {options.map((seed, index) => <label key={seed} className={value === seed ? 'selected' : ''}>
        <input type="radio" name="avatarSeed" value={seed} checked={value === seed} onChange={() => onChange(seed)} />
        <Avatar name={name || 'Leve'} seed={seed} decorative />
        <span className="visually-hidden">Opção {index + 1}</span>
      </label>)}
    </div>
    <p className="avatar-credit">Ilustrações geradas com DiceBear e o estilo Avataaars.</p>
  </fieldset>;
}
