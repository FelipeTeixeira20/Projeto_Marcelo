import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import "./PageTransition.css";

const PageTransition = ({ children }) => {
  const [showAnimation, setShowAnimation] = useState(true);
  const firstLoad = useRef(true);
  const location = useLocation();

  // Animação apenas no primeiro carregamento
  useEffect(() => {
    if (firstLoad.current) {
      setTimeout(() => {
        setShowAnimation(false);
        firstLoad.current = false;
      }, 2000); // 🕒 Animação só na primeira carga
    }
  }, []);

  // Suaviza a transição entre páginas (duração reduzida para 0.6s)
  useEffect(() => {
    if (!firstLoad.current) {
      setShowAnimation(true);
      setTimeout(() => {
        setShowAnimation(false);
      }, 600); // 🔄 Reduzi para 0.6s na troca de tela
    }
  }, [location]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showAnimation && (
          <motion.div
            className="transition-overlay"
            initial={{ scale: firstLoad.current ? 30 : 0, opacity: 1 }}
            animate={{ scale: firstLoad.current ? 0 : 10, opacity: 1 }}
            exit={{ scale: firstLoad.current ? 0 : 20, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }} // 🚀 Mais rápido e fluido
          />
        )}
      </AnimatePresence>

      {children}
    </>
  );
};

export default PageTransition;
