import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(
    () => form.email.trim().length > 0 && form.password.trim().length > 0,
    [form.email, form.password]
  );

  const validate = () => {
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const user = await login(form.email.trim(), form.password);
      toast.success("Welcome back");
      navigate(user.role === "consultancy" ? "/consultancy/dashboard" : "/student/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to login");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(180deg,_#eff6ff_0%,_#f8fafc_50%,_#ffffff_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-blue-100/60 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden flex-col justify-between bg-gray-900 p-10 text-white lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-200">
              Consultancy CRM
            </p>
            <h1 className="mt-6 max-w-sm font-heading text-4xl font-semibold leading-tight">
              Run student admissions, visa tracking, and document workflows in one place.
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">
            Sign in
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold text-gray-900">
            Welcome back
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            Access the consultancy workspace or your student portal with your registered email.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {errors.email ? <p className="mt-2 text-sm text-rose-600">{errors.email}</p> : null}
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-semibold text-gray-700"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {errors.password ? (
                <p className="mt-2 text-sm text-rose-600">{errors.password}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={submitting || !isValid}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-500">
            Need a student account?{" "}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
