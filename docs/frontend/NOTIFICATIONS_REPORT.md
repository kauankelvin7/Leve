# Identidade visual das notificações

Atualizado em 06/10/2026. Base de entrada: `0316a5f`.

A captura do Android mostrou uma letra "L" genérica no lugar do ícone do Leve.
O worker usava SVG para a notificação e o manifesto declarava o mesmo SVG como
ícone any e maskable. Agora há PNGs rasterizados a partir da marca oficial,
com dimensões reais de 192/512 px, máscara com área segura, versão de 180 px
para iOS e badge branco sobre transparência para Android.

O título mostra o nome da atividade. O corpo explica quando acontece, sem repetir
o título. "Ver atividade" abre o destino já associado ao lembrete. A notificação
de exemplo nas configurações usa os mesmos ícones e formato. O worker ganhou
uma nova versão do cache e inclui os recursos de notificação para uso offline.

Para regenerar os arquivos com o Chromium instalado no ambiente:

```sh
LEVE_CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/generate-pwa-icons.mjs
```

O navegador/sistema controla cores, disposição, exibição do domínio e suporte
a ações. Não é possível remover essa identificação de segurança com CSS ou
opções do Web Push. A instalação como PWA pode apresentar a identidade do app;
instalações existentes dependem da atualização do manifesto pelo navegador.
Após a publicação, abrir o Leve para atualizar o worker e usar "Ver exemplo de
notificação" permite conferir o resultado no aparelho. A captura anterior
comprova entrega real, mas o novo visual ainda exige essa conferência física.

Validação local: lint/arquitetura, typecheck/build, worker e ícones PNG,
ação de abrir a atividade e duas integrações de agendamento/entrega passaram.
CI, Planner e Seasonal são os gates antes da integração da branch.
