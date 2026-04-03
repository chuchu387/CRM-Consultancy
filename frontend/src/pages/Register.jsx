import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(
    () =>
      form.name.trim().length > 0 &&
      form.email.trim().length > 0 &&
      form.password.trim().length > 0 &&
      form.confirmPassword.trim().length > 0,
    [form.confirmPassword, form.email, form.name, form.password]
  );

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Name is required";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match";
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
      await register(form.name.trim(), form.email.trim(), form.password);
      toast.success("Account created successfully");
      navigate("/student/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to register");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.18),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.14),_transparent_30%),linear-gradient(180deg,_#eef2ff_0%,_#f8fafc_48%,_#ffffff_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-blue-100/60 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden bg-blue-600 p-10 text-white lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-blue-100">
            Student Portal
          </p>
          <h1 className="mt-6 max-w-sm font-heading text-4xl font-semibold leading-tight">
            Create your account and keep every visa milestone in view.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-blue-100">
            Register once to receive document requests, track application status, and coordinate
            meetings with the consultancy team.
          </p>
        </div>

        <div className="p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">
            Register
          </p>
          <h2 className="mt-3 font-heading text-3xl font-semibold text-gray-900">
            Create your student account
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            You will be logged in automatically after registration.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              {errors.name ? <p className="mt-2 text-sm text-rose-600">{errors.name}</p> : null}
            </div>

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

            <div className="grid gap-5 md:grid-cols-2">
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

              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-gray-700"
                  htmlFor="confirmPassword"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
                {errors.confirmPassword ? (
                  <p className="mt-2 text-sm text-rose-600">{errors.confirmPassword}</p>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !isValid}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-500">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
