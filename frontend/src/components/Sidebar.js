import React from "react";
import { Link } from "react-router-dom"; // ✅ Importando Link para navegação correta
import {
  FaBars,
  FaTimes,
  FaHome,
  FaCog,
  FaSignOutAlt,
  FaStar,
  FaUser,
} from "react-icons/fa";
import { MdShowChart } from "react-icons/md"; // Ícone correto para gráficos
import { useSidebar } from "../context/SidebarContext";
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
        <Link to="/" className="menu-item">
          <FaHome className="menu-icon" />
          <span className="menu-text">Dashboard</span>
        </Link>

        <Link to="/market-analysis" className="menu-item">
          <MdShowChart className="menu-icon" />
          <span className="menu-text">Análise de Mercado</span>
        </Link>

        <Link to="/favorites" className="menu-item">
          <FaStar className="menu-icon" />
          <span className="menu-text">Favoritos</span>
        </Link>

        <Link to="/profile" className="menu-item">
          <FaUser className="menu-icon" />
          <span className="menu-text">Perfil</span>
        </Link>

        <Link to="/settings" className="menu-item">
          <FaCog className="menu-icon" />
          <span className="menu-text">Configurações</span>
        </Link>

        <Link to="/logout" className="menu-item logout">
          <FaSignOutAlt className="menu-icon" />
          <span className="menu-text">Logout</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
