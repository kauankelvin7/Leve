export const statusPageCodes = [400, 401, 403, 404, 500, 502, 503] as const;

export type StatusPageCode = typeof statusPageCodes[number];

type StatusPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
};

export const statusPageContent: Record<StatusPageCode, StatusPageContent> = {
  400: {
    eyebrow: 'Pedido inválido',
    title: 'Não conseguimos entender este pedido.',
    description: 'Confira as informações e tente novamente.',
    action: 'Tentar novamente',
  },
  401: {
    eyebrow: 'Sua sessão terminou',
    title: 'Entre novamente para continuar.',
    description: 'Sua agenda continua protegida. Confirme seu acesso para voltar ao que estava fazendo.',
    action: 'Entrar novamente',
  },
  403: {
    eyebrow: 'Acesso indisponível',
    title: 'Esta página não está disponível para esta conta.',
    description: 'Verifique o acesso ou entre com outra conta para continuar.',
    action: 'Verificar acesso',
  },
  404: {
    eyebrow: 'Página não encontrada',
    title: 'Este caminho não leva a lugar nenhum.',
    description: 'O endereço pode estar incompleto ou a página foi movida.',
    action: 'Abrir minha agenda',
  },
  500: {
    eyebrow: 'Algo não saiu como esperado',
    title: 'Tivemos um problema ao abrir esta parte do Leve.',
    description: 'Nenhuma alteração foi confirmada. Tente novamente em alguns instantes.',
    action: 'Tentar novamente',
  },
  502: {
    eyebrow: 'Conexão interrompida',
    title: 'O Leve está se reconectando.',
    description: 'A resposta do serviço não chegou como esperávamos. Tente novamente em alguns instantes.',
    action: 'Tentar novamente',
  },
  503: {
    eyebrow: 'Serviço indisponível',
    title: 'O Leve está temporariamente indisponível.',
    description: 'Aguarde um momento e tente novamente. Suas alterações locais continuam neste aparelho.',
    action: 'Tentar novamente',
  },
};

export function asStatusPageCode(status: number): StatusPageCode {
  return statusPageCodes.includes(status as StatusPageCode) ? status as StatusPageCode : 503;
}

export function apiErrorMessage(status: number) {
  return statusPageContent[asStatusPageCode(status)].description;
}
