import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "./context/SidebarContext"; // Importando o provider
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

function App() {
    return (
        <SidebarProvider>
            <Router>
                <Sidebar />
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </Router>
        </SidebarProvider>
    );
}

export default App;
