import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { SidebarProvider } from "./context/SidebarContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import PageTransition from "./components/PageTransition";

function AnimatedRoutes() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/analytics" element={<Analytics />} />
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
