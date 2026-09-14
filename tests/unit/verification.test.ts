import { beforeEach, expect, it, vi } from 'vitest';
import { sendEmailVerification, type User } from 'firebase/auth';
import { sendVerification } from '../../apps/web/src/features/identity/verification';

vi.mock('firebase/auth', () => ({ sendEmailVerification: vi.fn() }));
const user = {} as User;
beforeEach(() => vi.resetAllMocks());

it('usa o handler Firebase quando o retorno local nao esta autorizado', async () => {
  vi.mocked(sendEmailVerification).mockRejectedValueOnce({ code: 'auth/unauthorized-continue-uri' }).mockResolvedValueOnce();
  await sendVerification(user, 'http://127.0.0.1:5173');
  expect(sendEmailVerification).toHaveBeenNthCalledWith(2, user);
});

it('nao repete envio quando o Firebase limita tentativas', async () => {
  const failure = { code: 'auth/too-many-requests' };
  vi.mocked(sendEmailVerification).mockRejectedValueOnce(failure);
  await expect(sendVerification(user, 'http://127.0.0.1:5173')).rejects.toBe(failure);
  expect(sendEmailVerification).toHaveBeenCalledTimes(1);
});
