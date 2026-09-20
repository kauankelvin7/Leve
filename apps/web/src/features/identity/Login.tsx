import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { GoogleAuthProvider, createUserWithEmailAndPassword, getRedirectResult, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, updateProfile } from 'firebase/auth';
import { sendVerification } from './verification';
import { Link, Navigate } from 'react-router-dom';
import type { CommandEnvelope } from '../../../../../packages/domain/src/identity';
import { completeLocalEmailVerification, configured, emulatorMode, firebaseAuth } from '../../platform/firebase';
import { sendCommand } from '../../platform/api';
import { useAuth } from './AuthProvider';
import { AuthBackdrop } from './AuthBackdrop';

type AuthMode = 'login' | 'register' | 'recovery';
type Feedback = { kind: 'error' | 'success'; text: string } | null;
type OnboardingDraft = { displayName: string; timeZone: string };

function authMessage(error: unknown) {
  const code = (error as { code?: string }).code;
  const messages: Record<string, string> = {
    'auth/account-exists-with-different-credential': 'Este e-mail já usa outra forma de entrada. Tente entrar com Google.',
    'auth/argument-error': 'Não foi possível abrir o acesso do Google. Recarregue a página e tente novamente.',
    'auth/email-already-in-use': 'Este e-mail já tem uma conta. Entre com sua senha ou recupere o acesso.',
    'auth/invalid-credential': emulatorMode ? 'E-mail ou senha incorretos. Use uma conta criada neste ambiente local.' : 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Conta não encontrada neste ambiente. Crie uma conta para continuar.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/invalid-continue-uri': 'O endereço de retorno da confirmação não é válido.',
    'auth/invalid-email': 'Informe um endereço de e-mail válido.',
    'auth/internal-error': 'O serviço de acesso encontrou uma instabilidade. Tente novamente.',
    'auth/missing-continue-uri': 'Não foi possível preparar o retorno da confirmação.',
    'auth/network-request-failed': 'Sem conexão. Verifique sua internet e tente novamente.',
    'auth/operation-not-allowed': 'Esta forma de entrada ainda não está disponível.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.',
    'auth/cancelled-popup-request': 'A tentativa anterior foi substituída. Tente entrar com Google novamente.',
    'auth/popup-closed-by-user': 'Entrada com Google cancelada.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
    'auth/unauthorized-domain': 'Não foi possível entrar por este endereço. Use o endereço oficial do Leve.',
    'auth/unauthorized-continue-uri': 'Não foi possível concluir a entrada por este endereço.',
    'auth/user-disabled': 'Esta conta está desativada. Entre em contato com o mantenedor.',
    'auth/web-storage-unsupported': 'Este navegador está bloqueando o armazenamento necessário para entrar.',
    'auth/weak-password': 'Use uma senha com pelo menos 8 caracteres.',
  };
  return code && messages[code] ? messages[code] : 'Não foi possível concluir o acesso. Tente novamente.';
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function GoogleLogo() {
  return <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.7-.06-1.38-.18-2.02H12v3.83h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.2Z"/><path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.74 9.74 0 0 0 12 21.7Z"/><path fill="#FBBC05" d="M6.53 13.79a5.85 5.85 0 0 1 0-3.58V7.68H3.29a9.74 9.74 0 0 0 0 8.64l3.24-2.53Z"/><path fill="#EA4335" d="M12 6.18c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.83 3.3 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.71 5.38l3.24 2.53C7.3 7.9 9.46 6.18 12 6.18Z"/></svg>;
}

function PasswordField({ name, label, autoComplete }: { name: string; label: string; autoComplete: 'current-password' | 'new-password' }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return <div className="password-group"><label htmlFor={id}>{label}</label><span className="password-field"><input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} required minLength={autoComplete === 'new-password' ? 8 : undefined} /><button type="button" className="password-toggle" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLocaleLowerCase('pt-BR')}`} aria-pressed={visible} onClick={() => setVisible(previous => !previous)}>{visible ? 'Ocultar' : 'Mostrar'}</button></span></div>;
}

export function Login({ mode = 'login' }: { mode?: AuthMode }) {
  const { user, session, loading, error: sessionError, refresh, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [draft, setDraft] = useState<OnboardingDraft>({ displayName: '', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const pendingActivation = useRef<CommandEnvelope | null>(null);
  const redirectChecked = useRef(false);

  useEffect(() => {
    if (!firebaseAuth || mode === 'recovery' || redirectChecked.current) return;
    redirectChecked.current = true;
    void getRedirectResult(firebaseAuth).catch(failure => setFeedback({ kind: 'error', text: authMessage(failure) }));
  }, [mode]);

  if (loading) return <main className="entry" role="status">Verificando sua conta…</main>;
  if (session?.membership === 'active' && session.profile?.accountState === 'active') return <Navigate to="/hoje" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseAuth || busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email')).trim();
    setBusy(true);
    setFeedback(null);
    try {
      if (mode === 'recovery') {
        try { await sendPasswordResetEmail(firebaseAuth, email, { url: `${window.location.origin}/entrar` }); } catch { }
        setFeedback({ kind: 'success', text: 'Se houver uma conta compatível com esse e-mail, você receberá as instruções. Contas Google devem ser recuperadas pelo Google.' });
      } else if (mode === 'register') {
        const password = String(fields.get('password'));
        if (password !== String(fields.get('passwordConfirmation'))) {
          setFeedback({ kind: 'error', text: 'As senhas não coincidem.' });
          return;
        }
        const onboarding = { displayName: String(fields.get('name')).trim(), timeZone: draft.timeZone };
        setDraft(onboarding);
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await updateProfile(credential.user, { displayName: onboarding.displayName });
        await sendVerification(credential.user, window.location.origin);
        setFeedback({ kind: 'success', text: emulatorMode ? 'Conta local criada. Use Confirmar neste ambiente para continuar.' : 'Conta criada. Enviamos um link de verificação para o seu e-mail.' });
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, String(fields.get('password')));
      }
    } catch (failure) {
      setFeedback({ kind: 'error', text: authMessage(failure) });
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (!firebaseAuth || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await signInWithPopup(firebaseAuth, googleProvider());
    } catch (failure) {
      const code = (failure as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/internal-error') {
        try { await signInWithRedirect(firebaseAuth, googleProvider()); return; }
        catch (redirectFailure) { setFeedback({ kind: 'error', text: authMessage(redirectFailure) }); }
      } else setFeedback({ kind: 'error', text: authMessage(failure) });
    } finally {
      setBusy(false);
    }
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    const fields = new FormData(event.currentTarget);
    const payload = { profile: { displayName: String(fields.get('name')).trim(), locale: 'pt-BR' as const, weekStartsOn: 1 as const, reduceTransparency: false } };
    if (!pendingActivation.current || JSON.stringify(pendingActivation.current.payload) !== JSON.stringify(payload)) pendingActivation.current = { command: 'account.activate', entityId: user.uid, operationId: crypto.randomUUID(), expectedRevision: 0, payload };
    setBusy(true);
    setFeedback(null);
    try {
      await sendCommand(pendingActivation.current);
      pendingActivation.current = null;
      await refresh();
    } catch (failure) {
      setFeedback({ kind: 'error', text: failure instanceof Error ? failure.message : 'Não foi possível ativar sua agenda.' });
    } finally {
      setBusy(false);
    }
  }

  async function confirmVerification() {
    if (!user || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await user.reload();
      await user.getIdToken(true);
      if (!user.emailVerified) {
        setFeedback({ kind: 'error', text: 'O e-mail ainda não aparece como confirmado. Abra o link recebido e tente novamente.' });
        return;
      }
      await refresh();
      setFeedback({ kind: 'success', text: 'E-mail confirmado. Agora finalize sua agenda.' });
    } catch (failure) {
      setFeedback({ kind: 'error', text: authMessage(failure) });
    } finally {
      setBusy(false);
    }
  }

  async function confirmLocalVerification() {
    if (!user?.email || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await completeLocalEmailVerification(user.email);
      await user.reload();
      await user.getIdToken(true);
      if (!user.emailVerified) throw new Error('Email verification was not applied.');
      await refresh();
      setFeedback({ kind: 'success', text: 'E-mail confirmado no ambiente local. Agora finalize sua agenda.' });
    } catch {
      setFeedback({ kind: 'error', text: 'Não foi possível confirmar o e-mail no ambiente local. Reenvie o código e tente novamente.' });
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'recovery' ? 'Recuperar acesso' : user ? 'Finalize sua agenda' : mode === 'register' ? 'Crie seu acesso' : 'Entre na sua agenda';
  return <div className="auth-page"><AuthBackdrop /><aside className="auth-brand"><Link className="brand" to="/entrar">leve<span>.</span></Link><p>Organize o que importa.<br />Respire o resto.</p></aside><main className="entry auth-entry">
    {!user && mode !== 'recovery' ? <nav className="auth-switch" aria-label="Acesso"><Link to="/entrar" aria-current={mode === 'login' ? 'page' : undefined}>Entrar</Link><Link to="/registrar" aria-current={mode === 'register' ? 'page' : undefined}>Criar conta</Link></nav> : null}
    <p className="eyebrow">Sua agenda privada</p><h1 id="page-title" tabIndex={-1}>{title}</h1>
    {!user && mode === 'recovery' ? <p className="auth-description">Informe seu e-mail para recuperar o acesso.</p> : null}
    {!user && mode === 'login' ? <p className="auth-description">Continue de onde parou.</p> : null}
    {emulatorMode ? <p className="notice">Ambiente de teste local ativo.</p> : null}
    {!configured ? <p role="alert" className="notice">A conexão com o serviço de acesso não foi estabelecida. Recarregue a página e tente novamente.</p> : null}
    {sessionError && user?.emailVerified && !feedback ? <div role="alert" className="auth-alert"><p>{sessionError}</p><button type="button" onClick={() => void refresh()}>Tentar novamente</button></div> : null}
    {feedback ? <p className={`auth-feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'} aria-live="polite">{feedback.text}</p> : null}
    {user ? <>
      {session?.membership === 'suspended' ? <p role="alert">O acesso desta conta está suspenso. Entre em contato com o mantenedor.</p> : session?.profile?.accountState === 'deleting' ? <p role="status">Sua conta está em exclusão. Novas alterações estão bloqueadas.</p> : !user.emailVerified ? <section className="verification-step">
        {emulatorMode
          ? <p>O ambiente local não envia e-mails reais. Confirme <strong>{user.email}</strong> usando o código de teste gerado pelo emulador.</p>
          : <p>Enviamos um link para <strong>{user.email}</strong>. Abra-o para confirmar seu e-mail. Não encontrou? Confira o spam ou reenvie.</p>}
        <div className="dialog-actions">
          <button type="button" disabled={busy} onClick={async () => { setBusy(true); setFeedback(null); try { await sendVerification(user, window.location.origin); setFeedback({ kind: 'success', text: emulatorMode ? 'Novo código local gerado.' : 'E-mail de verificação reenviado.' }); } catch (failure) { setFeedback({ kind: 'error', text: authMessage(failure) }); } finally { setBusy(false); } }}>{emulatorMode ? 'Gerar novo código' : 'Reenviar e-mail'}</button>
          <button type="button" className="primary" disabled={busy} onClick={() => void (emulatorMode ? confirmLocalVerification() : confirmVerification())}>{busy ? 'Verificando…' : emulatorMode ? 'Confirmar neste ambiente' : 'Já confirmei'}</button>
        </div>
      </section> : <form onSubmit={activate} onChange={() => { pendingActivation.current = null; }}><p>Como podemos chamar você?</p><label>Seu nome<input name="name" autoComplete="name" required maxLength={80} defaultValue={draft.displayName || user.displayName || ''} /></label><button className="primary auth-submit" disabled={busy}>{busy ? 'Ativando…' : 'Criar minha agenda'}</button></form>}
      <button type="button" className="text-button" disabled={busy} onClick={() => void logout()}>Sair desta conta</button>
    </> : <>
      <form onSubmit={submit}>{mode === 'register' ? <><p className="auth-description">Crie seu acesso com e-mail e senha ou use sua conta Google.</p><label>Seu nome<input name="name" autoComplete="name" required maxLength={80} /></label></> : null}<label>E-mail<input name="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" required disabled={!configured || busy} /></label>{mode !== 'recovery' ? <PasswordField name="password" label="Senha" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /> : null}{mode === 'register' ? <><PasswordField name="passwordConfirmation" label="Confirmar senha" autoComplete="new-password" /><small className="field-hint">Mínimo de 8 caracteres.</small></> : null}<button className="primary auth-submit" disabled={!configured || busy}>{busy ? 'Aguarde…' : mode === 'recovery' ? 'Enviar instruções' : mode === 'register' ? 'Criar conta' : 'Entrar'}</button></form>
      {mode !== 'recovery' ? <><div className="auth-divider"><span>ou</span></div><button type="button" className="google-button" disabled={!configured || busy} onClick={() => void google()}><GoogleLogo />{mode === 'register' ? ' Criar conta com Google' : ' Continuar com Google'}</button>{mode === 'login' ? <Link className="text-link recovery-link" to="/recuperar">Esqueci minha senha</Link> : null}</> : <Link className="text-link" to="/entrar">Voltar para entrar</Link>}
    </>}
    <p className="auth-privacy-link"><Link to="/privacidade">Como tratamos seus dados</Link></p>
  </main></div>;
}
