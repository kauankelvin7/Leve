export const activityColors = [
  { name: 'Lavanda', hex: '#8872B2', legacyHex: '#A08AC2' }, { name: 'Pêssego', hex: '#C88767', legacyHex: '#D6A283' },
  { name: 'Azul', hex: '#5F8FB8', legacyHex: '#86A5C6' }, { name: 'Sálvia', hex: '#708F72', legacyHex: '#8EAA8E' },
  { name: 'Rosa', hex: '#B76F88', legacyHex: '#CE92A5' }, { name: 'Amarelo', hex: '#B7983F', legacyHex: '#D4BB70' },
  { name: 'Turquesa', hex: '#4C9C96', legacyHex: '#76B4AE' }, { name: 'Lilás', hex: '#9B78B8', legacyHex: '#B393C7' },
  { name: 'Terracota', hex: '#AD6B54', legacyHex: '#C58B75' }, { name: 'Cinza', hex: '#77828C', legacyHex: '#9EA7B0' },
] as const;
export function activityColorName(hex?: string | null) { return activityColors.find(color => color.hex === hex || color.legacyHex === hex)?.name ?? 'Cor da categoria'; }
