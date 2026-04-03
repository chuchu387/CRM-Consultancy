import { useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import Sidebar from "./components/Sidebar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import ConsultancyDashboard from "./pages/consultancy/Dashboard";
import DocumentRequests from "./pages/consultancy/DocumentRequests";
import Applications from "./pages/consultancy/Applications";
import Invoices from "./pages/consultancy/Invoices";
import Meetings from "./pages/consultancy/Meetings";
import Search from "./pages/consultancy/Search";
import StudentDetail from "./pages/consultancy/StudentDetail";
import Students from "./pages/consultancy/Students";
import Tasks from "./pages/consultancy/Tasks";
import Templates from "./pages/consultancy/Templates";
import VisaApplications from "./pages/consultancy/VisaApplications";
import NotificationsCenter from "./pages/NotificationsCenter";
import StudentDashboard from "./pages/student/Dashboard";
import MyApplications from "./pages/student/MyApplications";
import MyDocuments from "./pages/student/MyDocuments";
import MyInvoices from "./pages/student/MyInvoices";
import MyMeetings from "./pages/student/MyMeetings";
import MyVisa from "./pages/student/MyVisa";

const PublicRoute = () => {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (user) {
    return (
      <Navigate
        to={user.role === "consultancy" ? "/consultancy/dashboard" : "/student/dashboard"}
        replace
      />
    );
  }

  return <Outlet />;
};

const DashboardLayout = ({ role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:pl-56">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />

    <Route element={<PublicRoute />}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Route>

    <Route element={<PrivateRoute role="consultancy" />}>
      <Route path="/consultancy" element={<DashboardLayout role="consultancy" />}>
        <Route index element={<Navigate to="/consultancy/dashboard" replace />} />
        <Route path="dashboard" element={<ConsultancyDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="visa" element={<VisaApplications />} />
        <Route path="documents" element={<DocumentRequests />} />
        <Route path="templates" element={<Templates />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="tasks" element={<Tasks />} />
        <Route
          path="applications"
          element={<Navigate to="/consultancy/university-applications" replace />}
        />
        <Route path="university-applications" element={<Applications />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="search" element={<Search />} />
        <Route path="notifications" element={<NotificationsCenter />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Route>

    <Route element={<PrivateRoute role="student" />}>
      <Route path="/student" element={<DashboardLayout role="student" />}>
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="visa" element={<MyVisa />} />
        <Route path="documents" element={<MyDocuments />} />
        <Route
          path="applications"
          element={<Navigate to="/student/university-applications" replace />}
        />
        <Route path="university-applications" element={<MyApplications />} />
        <Route path="invoices" element={<MyInvoices />} />
        <Route path="meetings" element={<MyMeetings />} />
        <Route path="notifications" element={<NotificationsCenter />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
