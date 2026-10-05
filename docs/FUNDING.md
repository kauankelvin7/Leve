# Financiamento do Leve

## Objetivo

O Leve oferece duas formas de apoio sem criar paywall ou alterar o acesso aos recursos do produto:

1. GitHub Sponsors;
2. Pix direto pela página pública `/apoie`.

O apoio é voluntário. Ele ajuda a sustentar manutenção, segurança, acessibilidade, testes e evolução do projeto.

## GitHub Sponsors

O arquivo `.github/FUNDING.yml` aponta para `kauankelvin7`. Quando o perfil do GitHub Sponsors estiver ativo, o repositório mostra o botão **Sponsor**.

A ativação do perfil exige etapas pessoais do titular da conta, como dados de pagamento, identidade e informações fiscais. Essas etapas não devem ser automatizadas nem versionadas no repositório.

Depois de ativar:

1. abra o perfil do GitHub Sponsors;
2. confirme que o perfil está público;
3. configure os níveis de apoio que quiser oferecer;
4. teste o botão **Sponsor** no repositório do Leve.

## Pix direto

O Pix é exibido somente quando `VITE_SUPPORT_PIX_KEY` estiver definido no ambiente de build.

Em produção, configure:

```text
VITE_SUPPORT_PIX_KEY=<chave Pix pública>
```

Recomendação: use uma **chave aleatória**. Não use CPF, telefone ou e-mail, a menos que queira tornar esse dado público.

Variáveis com prefixo `VITE_` fazem parte do bundle do navegador. Portanto, essa chave não é um segredo e deve ser tratada como informação pública.

Depois de configurar a variável no provedor de hospedagem, gere um novo deploy. A rota `/apoie` passa a mostrar a chave e o botão para copiar.

## GitHub Sponsor button

O `.github/FUNDING.yml` contém:

```yaml
github: [kauankelvin7]
custom: ["https://leve-agenda.vercel.app/apoie"]
```

Assim, o botão de financiamento do repositório aponta tanto para o GitHub Sponsors quanto para a página do Leve.

## Privacidade

- nenhuma chave Pix real é armazenada no Git;
- nenhuma credencial bancária entra no frontend;
- a página não coleta dados de pagamento;
- o pagamento acontece no GitHub ou no aplicativo bancário da pessoa apoiadora;
- o Leve não registra telemetria de apoio.

## Validação

Antes de publicar alterações nesta área:

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run glass:check
```

Para validar a rota visualmente, o harness público inclui `/apoie` em light e dark.
