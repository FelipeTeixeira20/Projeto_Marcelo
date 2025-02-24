import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import "./PageTransition.css";

const PageTransition = ({ children }) => {
    const [showAnimation, setShowAnimation] = useState(true);
    const firstLoad = useRef(true); // Use useRef para persistir sem re-renderizar
    const location = useLocation();

    useEffect(() => {
        if (firstLoad.current) {
            setTimeout(() => {
                setShowAnimation(false);
                firstLoad.current = false; // Atualiza o useRef (não causa re-render)
            }, 2000);
        }
    }, []); // ✅ Rodando apenas no primeiro carregamento

    useEffect(() => {
        if (!firstLoad.current) { // Só roda na troca de páginas
            setShowAnimation(true);
            setTimeout(() => {
                setShowAnimation(false);
            }, 2000);
        }
    }, [location]); // ✅ Só roda quando a rota muda

    return (
        <>
            <AnimatePresence mode="wait">
                {showAnimation && (
                    <motion.div
                        className="transition-overlay"
                        initial={{ scale: firstLoad.current ? 30 : 0, opacity: 1 }}
                        animate={{ scale: firstLoad.current ? 0 : 25, opacity: 1 }}
                        exit={{ scale: firstLoad.current ? 0 : 30, opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                )}
            </AnimatePresence>

            {children}
        </>
    );
};

export default PageTransition;
