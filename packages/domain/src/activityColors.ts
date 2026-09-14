export const activityColors = [
  { name: 'Lavanda', hex: '#A08AC2' }, { name: 'Pêssego', hex: '#D6A283' },
  { name: 'Azul', hex: '#86A5C6' }, { name: 'Sálvia', hex: '#8EAA8E' },
  { name: 'Rosa', hex: '#CE92A5' }, { name: 'Amarelo', hex: '#D4BB70' },
  { name: 'Turquesa', hex: '#76B4AE' }, { name: 'Lilás', hex: '#B393C7' },
  { name: 'Terracota', hex: '#C58B75' }, { name: 'Cinza', hex: '#9EA7B0' },
] as const;
export function activityColorName(hex?: string | null) { return activityColors.find(color => color.hex === hex)?.name ?? 'Cor da categoria'; }
