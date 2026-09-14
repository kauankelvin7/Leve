import { sendEmailVerification, type User } from 'firebase/auth';

export async function sendVerification(user: User, origin: string) {
  try {
    await sendEmailVerification(user, { url: `${origin}/entrar` });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/unauthorized-continue-uri' && code !== 'auth/invalid-continue-uri') throw error;
    // Firebase's hosted action handler can confirm email without an app return URL.
    await sendEmailVerification(user);
  }
}
