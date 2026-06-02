import { Link } from "react-router-dom";

const UnauthorizedPage = () => (
  <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
    <div className="rounded-xl border border-rose-600/30 bg-slate-900 p-8 text-center">
      <h1 className="text-2xl font-bold text-rose-300">Unauthorized</h1>
      <p className="mt-2 text-slate-300">You do not have access to this route.</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-indigo-500 px-4 py-2 text-white">
        Go Home
      </Link>
    </div>
  </main>
);

export default UnauthorizedPage;
