import React from "react";
import { FaBars, FaTimes, FaHome, FaChartBar, FaCog, FaSignOutAlt } from "react-icons/fa";
import { useSidebar } from "../context/SidebarContext"; // Importando o contexto
import "./Sidebar.css";

const Sidebar = () => {
    const { isOpen, setIsOpen } = useSidebar();

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={`sidebar ${isOpen ? "open" : ""}`}>
            <button className="toggle-btn" onClick={toggleSidebar}>
                {isOpen ? <FaTimes /> : <FaBars />}
            </button>

            <div className="menu">
                <a href="/" className="menu-item">
                    <FaHome className="menu-icon" />
                    <span className="menu-text">Dashboard</span>
                </a>
                <a href="/analytics" className="menu-item">
                    <FaChartBar className="menu-icon" />
                    <span className="menu-text">Analytics</span>
                </a>
                <a href="/settings" className="menu-item">
                    <FaCog className="menu-icon" />
                    <span className="menu-text">Settings</span>
                </a>
                <a href="/logout" className="menu-item logout">
                    <FaSignOutAlt className="menu-icon" />
                    <span className="menu-text">Logout</span>
                </a>
            </div>
        </div>
    );
};

export default Sidebar;
