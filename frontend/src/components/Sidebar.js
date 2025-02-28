import React from "react";
import { Link } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaHome,
  FaCog,
  FaSignOutAlt,
  FaStar,
  FaUser,
} from "react-icons/fa";
import { MdShowChart } from "react-icons/md";
import { useSidebar } from "../context/SidebarContext";
import "./Sidebar.css";

const MenuItem = ({ to, icon: Icon, text, className = "" }) => (
  <Link to={to} className={`menu-item ${className}`}>
    <Icon className="menu-icon" />
    <span className="menu-text">{text}</span>
  </Link>
);

const Sidebar = () => {
  const { isOpen, setIsOpen } = useSidebar();

  const menuItems = [
    { to: "/", icon: FaHome, text: "Dashboard" },
    { to: "/market-analysis", icon: MdShowChart, text: "Análise de Mercado" },
    { to: "/favorites", icon: FaStar, text: "Favoritos" },
    { to: "/profile", icon: FaUser, text: "Perfil" },
    { to: "/settings", icon: FaCog, text: "Configurações" },
  ];

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      <div className="menu">
        {menuItems.map((item, index) => (
          <MenuItem key={index} {...item} />
        ))}

        <MenuItem
          to="/logout"
          icon={FaSignOutAlt}
          text="Logout"
          className="logout"
        />
      </div>
    </div>
  );
};

export default Sidebar;
