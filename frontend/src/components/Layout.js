import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "./Layout.css";

const Layout = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="layout">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <div className={`main-content ${isOpen ? "expanded" : ""}`}>
        <Header />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
