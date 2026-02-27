import dynamic from 'next/dynamic';

const SlotsClient = dynamic(() => import('./slots-client.jsx'), {
  ssr: false,
  loading: () => <main className="loading">Loading upgraded casino...</main>
});

export default function Page() {
  return <SlotsClient />;
}
