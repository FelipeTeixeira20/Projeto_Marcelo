import React, { useContext } from "react";
import Layout from "../components/Layout";
import CryptoBackground from "../components/CryptoBackground";
import { SettingsContext } from "../context/SettingsContext";
import "./Settings.css";

const Settings = () => {
  const {
    darkMode, setDarkMode,
    notifications, setNotifications,
    language, setLanguage,
    currency, setCurrency
  } = useContext(SettingsContext);

  return (
    <Layout>
      <CryptoBackground />

      <div className="settings-container">
        <h2>Configurações</h2>

        {/* 🔥 Modo Escuro (Agora funciona de verdade!) */}
        <div className="setting-item">
          <span>Modo Escuro</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
            <span className="slider round"></span>
          </label>
        </div>

        {/* 🔥 Notificações (Pode ser usado no futuro para alertas de preço) */}
        <div className="setting-item">
          <span>Notificações</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
            <span className="slider round"></span>
          </label>
        </div>

        {/* 🔥 Idioma (Agora altera textos do sistema!) */}
        <div className="setting-item">
          <span>Idioma</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="pt">Português</option>
            <option value="en">Inglês</option>
          </select>
        </div>

        {/* 🔥 Unidade de Moeda (Será aplicado no dashboard de preços) */}
        <div className="setting-item">
          <span>Unidade de Moeda</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="USD">Dólar (USD)</option>
            <option value="BRL">Real (BRL)</option>
            <option value="EUR">Euro (EUR)</option>
          </select>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
