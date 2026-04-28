import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login    from './pages/Login';
import Register from './pages/Register';
import Messenger from './pages/Messenger';

function Guard({ children }) {
    const { token } = useAuth();
    return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login"    element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/"         element={<Guard><Messenger /></Guard>} />
                        <Route path="*"         element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}