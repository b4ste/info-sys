import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import CorrectionRequestsPage from './pages/CorrectionRequestsPage.jsx'
import AcademicResourcePage from './pages/admin/AcademicResourcePage.jsx'
import ClassOfferingsPage from './pages/admin/ClassOfferingsPage.jsx'
import AuditPage from './pages/admin/AuditPage.jsx'
import EnrollmentApprovalsPage from './pages/admin/EnrollmentApprovalsPage.jsx'
import GradeOversightPage from './pages/admin/GradeOversightPage.jsx'
import ProfileManagementPage from './pages/admin/ProfileManagementPage.jsx'
import UsersPage from './pages/admin/UsersPage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import FinalGradesPage from './pages/faculty/FinalGradesPage.jsx'
import ClassGradingPage from './pages/faculty/ClassGradingPage.jsx'
import MyClassesPage from './pages/faculty/MyClassesPage.jsx'
import RosterPage from './pages/faculty/RosterPage.jsx'
import AcademicHistoryPage from './pages/student/AcademicHistoryPage.jsx'
import BrowseClassesPage from './pages/student/BrowseClassesPage.jsx'
import MyEnrollmentsPage from './pages/student/MyEnrollmentsPage.jsx'
import MyGradesPage from './pages/student/MyGradesPage.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'

const academicResources = ['departments', 'programs', 'sections', 'subjects', 'academic-terms']

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          {['student', 'faculty', 'admin'].map((role) => (
            <Route key={role} element={<ProtectedRoute roles={[role]} />}>
              <Route path={role} element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="settings" element={<SettingsPage />} />
                {role === 'student' && <>
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="classes" element={<BrowseClassesPage />} />
                  <Route path="requests" element={<MyEnrollmentsPage />} />
                  <Route path="enrolled" element={<MyEnrollmentsPage view="classes" />} />
                  <Route path="grades" element={<MyGradesPage />} />
                  <Route path="history" element={<AcademicHistoryPage />} />
                </>}
                {role === 'faculty' && <>
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="classes" element={<MyClassesPage />} />
                  <Route path="classes/:id/roster" element={<RosterPage />} />
                  <Route path="classes/:id/grades" element={<ClassGradingPage />} />
                  <Route path="final-grades" element={<FinalGradesPage />} />
                  <Route path="corrections" element={<CorrectionRequestsPage />} />
                </>}
                {role === 'admin' && <>
                  <Route path="users" element={<UsersPage />} />
                  <Route path="students" element={<ProfileManagementPage kind="student" />} />
                  <Route path="faculty" element={<ProfileManagementPage kind="faculty" />} />
                  {academicResources.map((resource) => <Route key={resource} path={resource} element={<AcademicResourcePage resource={resource} />} />)}
                  <Route path="curriculum-rules" element={<Navigate to="/admin" replace />} />
                  <Route path="offerings" element={<ClassOfferingsPage />} />
                  <Route path="enrollments" element={<EnrollmentApprovalsPage />} />
                  <Route path="grades" element={<GradeOversightPage />} />
                  <Route path="corrections" element={<CorrectionRequestsPage />} />
                  <Route path="audit" element={<AuditPage />} />
                </>}
              </Route>
            </Route>
          ))}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
