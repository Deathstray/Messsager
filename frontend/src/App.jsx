import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Messenger from './pages/Messenger';

function PrivateRoute({ children }) {
    const { token } = useAuth();
    return token ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
    const { token } = useAuth();
    return !token ? children : <Navigate to="/" replace />;
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
                        <Route path="/" element={<PrivateRoute><Messenger /></PrivateRoute>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}
