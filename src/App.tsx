import { Navigate, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { GuestRoute, ProtectedRoute } from "@/components/routing/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader } from "@/components/common/Feedback";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Departments from "./pages/admin/Departments";
import Faculty from "./pages/admin/Faculty";
import Courses from "./pages/admin/Courses";
import Subjects from "./pages/admin/Subjects";
import Attendance from "./pages/admin/Attendance";
import Exams from "./pages/admin/Exams";
import MarksEntry from "./pages/admin/MarksEntry";
import StudentResults from "./pages/student/Results";
import StudentList from "./pages/students/StudentList";
import StudentForm from "./pages/students/StudentForm";
import StudentDetail from "./pages/students/StudentDetail";
import StudentDashboard from "./pages/student/StudentDashboard";
import Notices from "./pages/Notices";
import CalendarPage from "./pages/Calendar";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Forbidden from "./pages/Forbidden";
import NotFound from "./pages/NotFound";

function HomeRedirect() {
  const { role, loading } = useAuth();
  if (loading) return <Loader />;
  return <Navigate to={role === "admin" ? "/admin" : "/student"} replace />;
}

const App = () => (
  <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <Signup />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomeRedirect />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Departments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty"
              element={
                <ProtectedRoute roles={["admin", "super_admin"]}>
                  <Faculty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute roles={["admin", "super_admin"]}>
                  <Courses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects"
              element={
                <ProtectedRoute roles={["admin", "super_admin"]}>
                  <Subjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Attendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <StudentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/new"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <StudentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:id"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <StudentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:id/edit"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <StudentForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <Exams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams/:id/marks"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <MarksEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student"
              element={
                <ProtectedRoute roles={["student"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/results"
              element={
                <ProtectedRoute roles={["student"]}>
                  <StudentResults />
                </ProtectedRoute>
              }
            />
            <Route path="/notices" element={<Notices />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="/403" element={<Forbidden />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
