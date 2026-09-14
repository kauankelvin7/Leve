import { Icon } from './Icon';
export function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="load-error" role="alert"><Icon name="calendar" /><p>{message}</p><button onClick={retry}>Tentar novamente</button></div>;
}
