export default function Home(){
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Welcome to RocketGPT</h1>
      <p className="text-gray-400">If you expected another page, use the links below.</p>
      <ul className="list-disc ml-6">
        <li><a className="underline" href="/login">Login</a></li>
        <li><a className="underline" href="/status">System Status</a></li>
      </ul>
    </main>
  );
}
