import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { SidebarProvider } from "./context/SidebarContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import MarketAnalysis from "./pages/MarketAnalysis";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import PageTransition from "./components/PageTransition";
import Login from './pages/Login';

// Componente para controlar o scroll
function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

function AnimatedRoutes() {
    const location = useLocation();
    const isLoginPage = location.pathname === '/login' || location.pathname === '/';

    return (
        <AnimatePresence mode="wait">
            {!isLoginPage && <Sidebar />}
            <PageTransition key={location.pathname}>
                <Routes location={location} key={location.pathname}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Login />} />
                    <Route
                        path="/dashboard"
                        element={
                            <PrivateRoute>
                                <Dashboard />
                            </PrivateRoute>
                        }
                    />
                    <Route path="/market-analysis" element={
                        <PrivateRoute>
                            <MarketAnalysis />
                        </PrivateRoute>
                    } />
                    <Route path="/favorites" element={
                        <PrivateRoute>
                            <Favorites />
                        </PrivateRoute>
                    } />
                    <Route path="/profile" element={
                        <PrivateRoute>
                            <Profile />
                        </PrivateRoute>
                    } />
                    <Route path="/settings" element={
                        <PrivateRoute>
                            <Settings />
                        </PrivateRoute>
                    } />
                </Routes>
            </PageTransition>
        </AnimatePresence>
    );
}

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <SidebarProvider>
            <Router>
                <ScrollToTop />
                <AnimatedRoutes />
            </Router>
        </SidebarProvider>
    );
}

export default App;
