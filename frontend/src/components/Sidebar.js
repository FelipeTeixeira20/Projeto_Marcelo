import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaBars,
  FaTimes,
  FaHome,
  FaCog,
  FaSignOutAlt,
  FaStar,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { MdShowChart, MdAttachMoney } from "react-icons/md";
import { useSidebar } from "../context/SidebarContext";
import "./Sidebar.css";

const MenuItem = ({ to, icon: Icon, text, className = "", onClick }) => {
  if (onClick) {
    return (
      <button onClick={onClick} className={`menu-item ${className}`}>
        <Icon className="menu-icon" />
        <span className="menu-text">{text}</span>
      </button>
    );
  }

  return (
    <Link to={to} className={`menu-item ${className}`}>
      <Icon className="menu-icon" />
      <span className="menu-text">{text}</span>
    </Link>
  );
};

const Sidebar = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token =
          localStorage.getItem("token") || sessionStorage.getItem("token");
        const baseURL =
          process.env.REACT_APP_API_URL ||
          `${window.location.protocol}//${window.location.hostname}`;
        const response = await axios.get(
            `${baseURL}/api/users/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error("Erro ao verificar status de admin:", error);
      }
    };

    checkAdminStatus();
  }, []);

  const handleLogout = () => {
    // Remover tokens de autenticação e username
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    // Redirecionar para a página de login
    navigate("/login");
  };

  const menuItems = [
    { to: "/dashboard", icon: FaHome, text: "Dashboard" },
    { to: "/market-analysis", icon: MdShowChart, text: "Análise de Mercado" },
    { to: "/favorites", icon: FaStar, text: "Favoritos" },
    { to: "/profile", icon: FaUser, text: "Perfil" },
  ];

  // Adiciona o item de gerenciamento de usuários apenas para admins
  if (isAdmin) {
    menuItems.push({ to: "/users", icon: FaUsers, text: "Gerenciar Usuários" });
  }

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
          icon={FaSignOutAlt}
          text="Logout"
          className="logout"
          onClick={handleLogout}
        />
      </div>
    </div>
  );
};

export default Sidebar;
