import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { SidebarProvider } from "./context/SidebarContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import MarketAnalysis from "./pages/MarketAnalysis";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import PageTransition from "./components/PageTransition";

function AnimatedRoutes() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/market-analysis" element={<MarketAnalysis />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </PageTransition>
        </AnimatePresence>
    );
}

function App() {
    return (
        <SidebarProvider>
            <Router>
                <Sidebar />
                <AnimatedRoutes />
            </Router>
        </SidebarProvider>
    );
}

export default App;
