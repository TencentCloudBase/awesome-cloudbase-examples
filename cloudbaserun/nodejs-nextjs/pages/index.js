export default function Home() {
  const msg = { message: 'Hello World from Next.js on CloudBase Run!', timestamp: new Date().toISOString() };
  return <pre>{JSON.stringify(msg, null, 2)}</pre>;
}
