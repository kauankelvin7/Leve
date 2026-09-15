import { describe, expect, it } from 'vitest';
import { apiErrorMessage, asStatusPageCode, statusPageCodes, statusPageContent } from '../../apps/web/src/app/statusPage.ts';

describe('estados de erro', () => {
  it('oferece conteúdo para cada resposta HTTP tratada na interface', () => {
    for (const status of statusPageCodes) {
      expect(statusPageContent[status].title).not.toHaveLength(0);
      expect(statusPageContent[status].description).not.toHaveLength(0);
      expect(apiErrorMessage(status)).toBe(statusPageContent[status].description);
    }
  });

  it('converte respostas desconhecidas em um estado seguro de indisponibilidade', () => {
    expect(asStatusPageCode(418)).toBe(503);
    expect(asStatusPageCode(0)).toBe(503);
  });
});
