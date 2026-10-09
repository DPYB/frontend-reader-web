import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Gnb from './components/Gnb';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './store/AuthProvider';
import { BooksProvider } from './store/BooksProvider';
import { ThemeProvider } from './store/ThemeProvider';
import { LibrarianProvider } from './store/LibrarianProvider';

// 라우트 레벨 코드 스플리팅 — 페이지별 전용 번들 분리
const MyLibrary = lazy(() => import('./pages/MyLibrary'));
const RegisterBook = lazy(() => import('./pages/RegisterBook'));
const MonthlyReport = lazy(() => import('./pages/MonthlyReport'));
const MyPage = lazy(() => import('./pages/MyPage'));
const LibrarianProfiles = lazy(() => import('./pages/LibrarianProfiles'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const PasswordReset = lazy(() => import('./pages/PasswordReset'));

function PageLoader() {
  return (
    <div className="page-loader">
      페이지를 불러오는 중입니다... 🐾
    </div>
  );
}

// 로그인 필요한 화면들 — ProtectedRoute로 감싸 비로그인 시 /login으로 유도
function AppLayout() {
  return (
    <ProtectedRoute>
      <Gnb />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/library" element={<MyLibrary />} />
          <Route path="/register" element={<RegisterBook />} />
          <Route path="/reports" element={<MonthlyReport />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/librarians" element={<LibrarianProfiles />} />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </Suspense>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ThemeProvider>
          <LibrarianProvider>
            <BooksProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/password/forgot" element={<PasswordReset />} />
                    <Route path="/*" element={<AppLayout />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </BooksProvider>
          </LibrarianProvider>
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;


