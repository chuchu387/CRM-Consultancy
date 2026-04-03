import { useMemo } from "react";
import {
  HiBars3BottomLeft,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentText,
  HiOutlineBellAlert,
  HiOutlineBriefcase,
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineRectangleStack,
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
  HiOutlineUserCircle,
  HiOutlineUsers,
  HiXMark,
} from "react-icons/hi2";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Sidebar = ({ role, isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const links = useMemo(() => {
    if (role === "consultancy") {
      return [
        { label: "Dashboard", path: "/consultancy/dashboard", icon: HiOutlineHome },
        { label: "Students", path: "/consultancy/students", icon: HiOutlineUsers },
        {
          label: "Visa Applications",
          path: "/consultancy/visa",
          icon: HiOutlineClipboardDocumentList,
        },
        {
          label: "Document Requests",
          path: "/consultancy/documents",
          icon: HiOutlineDocumentText,
        },
        { label: "Templates", path: "/consultancy/templates", icon: HiOutlineSparkles },
        { label: "Meetings", path: "/consultancy/meetings", icon: HiOutlineCalendarDays },
        { label: "Tasks", path: "/consultancy/tasks", icon: HiOutlineBriefcase },
        {
          label: "University Applications",
          path: "/consultancy/university-applications",
          icon: HiOutlineRectangleStack,
        },
        { label: "Invoices", path: "/consultancy/invoices", icon: HiOutlineReceiptPercent },
        { label: "Search", path: "/consultancy/search", icon: HiOutlineMagnifyingGlass },
        { label: "Notifications", path: "/consultancy/notifications", icon: HiOutlineBellAlert },
        { label: "Profile", path: "/consultancy/profile", icon: HiOutlineUserCircle },
      ];
    }

    return [
      { label: "Dashboard", path: "/student/dashboard", icon: HiOutlineHome },
      { label: "My Visa Status", path: "/student/visa", icon: HiOutlineClipboardDocumentList },
      { label: "My Documents", path: "/student/documents", icon: HiOutlineDocumentText },
      {
        label: "University Applications",
        path: "/student/university-applications",
        icon: HiOutlineRectangleStack,
      },
      { label: "Invoices", path: "/student/invoices", icon: HiOutlineReceiptPercent },
      { label: "Meetings", path: "/student/meetings", icon: HiOutlineCalendarDays },
      { label: "Notifications", path: "/student/notifications", icon: HiOutlineBellAlert },
      { label: "Profile", path: "/student/profile", icon: HiOutlineUserCircle },
    ];
  }, [role]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActivePath = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <>
      <button
        type="button"
        onClick={onClose ? () => onClose(false) : undefined}
        className="sr-only"
      >
        <HiBars3BottomLeft />
      </button>

      <div
        className={`fixed inset-0 z-30 bg-gray-950/50 transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-gray-900 px-3 py-2 text-white shadow-2xl transition-transform duration-200 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/80 transition hover:border-white/20 hover:bg-white/10 md:hidden"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-2 rounded-[1.25rem] border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-blue-500/20 text-sm font-semibold text-white">
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
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">
                {user?.name || (role === "consultancy" ? "Consultancy User" : "Student User")}
              </p>
              <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-blue-100/80">
                {role === "consultancy" ? "Consultancy" : "Student"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {links.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={`flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
                isActivePath(path)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-[1.25rem] border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] leading-5 text-gray-300">
            {role === "consultancy"
              ? "Manage docs, tasks, meetings, and admissions."
              : "Track docs, admissions, invoices, and meetings."}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[13px] font-semibold transition hover:bg-white/20"
          >
            <HiOutlineArrowLeftOnRectangle className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
