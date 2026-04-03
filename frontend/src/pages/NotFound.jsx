import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
    <div className="max-w-xl rounded-[2rem] border border-gray-200 bg-white p-10 text-center shadow-xl shadow-slate-100">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600">Error 404</p>
      <h1 className="mt-4 font-heading text-4xl font-semibold text-gray-900">
        This page does not exist
      </h1>
      <p className="mt-4 text-sm leading-7 text-gray-500">
        The link may be outdated, or the page may have moved. Use the home shortcut to return to
        the CRM.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Go to Home
      </Link>
    </div>
  </div>
);

export default NotFound;
