import { createContext, useContext, useState, useEffect, useMemo } from "react";

// Criar o contexto
const SidebarContext = createContext();

// Criar um provider para envolver o app
export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(() => {
    // Pegar estado salvo no localStorage ao carregar
    const savedState = localStorage.getItem("sidebarOpen");
    return savedState ? JSON.parse(savedState) : false;
  });

  // Sempre que o estado mudar, salvar no localStorage
  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(isOpen));
  }, [isOpen]);

  const contextValue = useMemo(
    () => ({ isOpen, setIsOpen }),
    [isOpen, setIsOpen]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
};

// Criar um hook para usar o contexto facilmente
export const useSidebar = () => useContext(SidebarContext);
