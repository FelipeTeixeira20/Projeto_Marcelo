import React, { createContext, useState, useEffect } from "react";

// Criando o contexto
export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  // Estado inicial carregado do localStorage
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );
  const [notifications, setNotifications] = useState(
    localStorage.getItem("notifications") === "true"
  );
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "pt"
  );
  const [currency, setCurrency] = useState(
    localStorage.getItem("currency") || "USD"
  );

  // Aplicar mudanças no localStorage quando os estados mudam
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    localStorage.setItem("notifications", notifications);
    localStorage.setItem("language", language);
    localStorage.setItem("currency", currency);

    // Aplica o tema escuro/claro no body
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode, notifications, language, currency]);

  return (
    <SettingsContext.Provider
      value={{ darkMode, setDarkMode, notifications, setNotifications, language, setLanguage, currency, setCurrency }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
