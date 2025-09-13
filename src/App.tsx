import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import AttendancePage from './pages/AttendancePage';
import './index.css';

// Placeholder components
const Dashboard = () => <div className="text-center py-8">Dashboard</div>;
const GradesPage = () => <div className="text-center py-8">Trang quản lý điểm đang được xây dựng...</div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Main attendance page - always accessible */}
            <Route path="/" element={<AttendancePage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            
            {/* Other routes for future */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/grades" element={<GradesPage />} />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Toast notifications */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
