import { useMemo } from "react";
import { HiBars3BottomLeft } from "react-icons/hi2";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const titleMatchers = [
  { match: "/consultancy/dashboard", title: "Consultancy Dashboard" },
  { match: "/consultancy/students", title: "Students" },
  { match: "/consultancy/visa", title: "Visa Applications" },
  { match: "/consultancy/documents", title: "Document Requests" },
  { match: "/consultancy/meetings", title: "Meetings" },
  { match: "/consultancy/templates", title: "Checklist Templates" },
  { match: "/consultancy/tasks", title: "Task Management" },
  { match: "/consultancy/university-applications", title: "University Applications" },
  { match: "/consultancy/invoices", title: "Invoices" },
  { match: "/consultancy/search", title: "Global Search" },
  { match: "/consultancy/notifications", title: "Notifications" },
  { match: "/consultancy/profile", title: "Profile Settings" },
  { match: "/student/dashboard", title: "Student Dashboard" },
  { match: "/student/visa", title: "My Visa Status" },
  { match: "/student/documents", title: "My Documents" },
  { match: "/student/meetings", title: "Meetings" },
  { match: "/student/university-applications", title: "My University Applications" },
  { match: "/student/invoices", title: "My Invoices" },
  { match: "/student/notifications", title: "Notifications" },
  { match: "/student/profile", title: "Profile Settings" },
];

const Navbar = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const title = useMemo(() => {
    const matched = titleMatchers.find(({ match }) => location.pathname.startsWith(match));

    if (matched) {
      return matched.title;
    }

    if (location.pathname.includes("/students/")) {
      return "Student Detail";
    }

    return "Consultancy CRM";
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200/80 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-2xl border border-gray-200 p-2 text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 md:hidden"
          >
            <HiBars3BottomLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
              Workspace
            </p>
            <h2 className="mt-1 font-heading text-xl font-semibold text-gray-900">{title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell role={user?.role} />
          <button
            type="button"
            onClick={() => navigate(user?.role === "consultancy" ? "/consultancy/profile" : "/student/profile")}
            className="flex items-center gap-3 rounded-3xl border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 font-heading text-lg font-semibold text-blue-700">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || "Profile"}
                  className="h-full w-full object-cover"
                />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  user?.role === "consultancy"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {user?.role === "consultancy" ? "Consultancy" : "Student"}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
