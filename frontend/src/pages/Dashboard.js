import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";
import axios from "axios";
import { FaStar } from "react-icons/fa";
import "./Dashboard.css";

// Substitua SEU_IP_LOCAL pelo IP da sua máquina (exemplo: 192.168.1.100)
const SERVER_URL = window.location.hostname === '10.100.50.38' 
    ? '10.100.50.38' 
    : window.location.hostname;

const Dashboard = () => {
    const [cryptos, setCryptos] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("");
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [wsStatus, setWsStatus] = useState("⭕ Desconectado");
    const [priceChanges, setPriceChanges] = useState({});
    
    const ws = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 5;

    // Função para buscar dados iniciais
    const fetchInitialData = async () => {
        try {
            const response = await axios.get(`http://${SERVER_URL}:5000/api/mexc/prices`);
            console.log("Dados iniciais recebidos:", response.data.length, "criptomoedas");
            setCryptos(response.data);
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Erro ao buscar dados iniciais:", error.message);
            setWsStatus("🔴 Erro ao carregar dados");
        }
    };

    // Função para processar novos dados
    const processNewData = useCallback((newData) => {
        setCryptos(prevCryptos => {
            const hasChanges = JSON.stringify(prevCryptos) !== JSON.stringify(newData);
            if (hasChanges) {
                const changes = {};
                newData.forEach(newCrypto => {
                    const oldCrypto = prevCryptos.find(c => c.symbol === newCrypto.symbol);
                    if (oldCrypto && parseFloat(oldCrypto.price) !== parseFloat(newCrypto.price)) {
                        changes[newCrypto.symbol] = parseFloat(newCrypto.price) > parseFloat(oldCrypto.price) ? 'up' : 'down';
                    }
                });
                setPriceChanges(changes);
                setTimeout(() => setPriceChanges({}), 1000);
                setLastUpdate(new Date());
                return newData;
            }
            return prevCryptos;
        });
    }, []);

    // Função para conectar WebSocket
    const connectWebSocket = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            console.log("WebSocket já está conectado");
            return;
        }

        try {
            console.log("Iniciando conexão WebSocket...");
            ws.current = new WebSocket(`ws://${SERVER_URL}:5000/ws`);

            ws.current.onopen = () => {
                console.log("WebSocket conectado com sucesso!");
                setWsStatus("🟢 Conectado");
                reconnectAttemptsRef.current = 0;
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (Array.isArray(data)) {
                        processNewData(data);
                    } else {
                        console.warn("Dados recebidos em formato inválido:", typeof data);
                    }
                } catch (error) {
                    console.error("Erro ao processar mensagem:", error.message);
                }
            };

            ws.current.onclose = (event) => {
                console.log("WebSocket fechado. Código:", event.code, "Razão:", event.reason);
                setWsStatus("⭕ Desconectado");

                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    const timeout = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                    console.log(`Tentando reconectar em ${timeout/1000} segundos...`);
                    
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connectWebSocket();
                    }, timeout);
                } else {
                    setWsStatus("🔴 Erro: Muitas tentativas de reconexão");
                    console.error("Máximo de tentativas de reconexão atingido");
                }
            };

            ws.current.onerror = (error) => {
                console.error("Erro no WebSocket:", error);
                setWsStatus("🔴 Erro na conexão");
            };

        } catch (error) {
            console.error("Erro ao configurar WebSocket:", error.message);
            setWsStatus("🔴 Erro na configuração");
        }
    }, [processNewData]);

    // Efeito para inicializar a conexão
    useEffect(() => {
        fetchInitialData();
        connectWebSocket();

        return () => {
            console.log("Limpando recursos...");
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connectWebSocket]);

    const toggleFavorite = (symbol) => {
        setFavorites(prev =>
            prev.includes(symbol) ? prev.filter(fav => fav !== symbol) : [...prev, symbol]
        );
    };

    const filteredCryptos = cryptos.filter(crypto =>
        crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedCryptos = [...filteredCryptos].sort((a, b) => {
        if (sortOption === "price-asc") return parseFloat(a.price) - parseFloat(b.price);
        if (sortOption === "price-desc") return parseFloat(b.price) - parseFloat(a.price);
        if (sortOption === "alphabetical") return a.symbol.localeCompare(b.symbol);
        return 0;
    });

    return (
        <Layout>
            <div className="animated-background">
                <div className="animated-lines">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>
            <div className="dashboard-container">
                <h2 className="dashboard-title">Mercado de Criptomoedas</h2>
                <p className="dashboard-subtitle">Confira os preços atualizados das moedas na MEXC.</p>
                <div className="status-container">
                    <p className="last-update">Última atualização: {lastUpdate.toLocaleTimeString('pt-BR', { hour12: false })}</p>
                    <p className="ws-status">Status: {wsStatus}</p>
                </div>

                <div className="search-filter-container">
                    <input
                        type="text"
                        placeholder="🔍 Buscar moeda..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="filter-select"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                    >
                        <option value="">Ordenar por...</option>
                        <option value="price-asc">Preço: Menor → Maior</option>
                        <option value="price-desc">Preço: Maior → Menor</option>
                        <option value="alphabetical">Nome: A → Z</option>
                    </select>
                </div>

                <div className="crypto-container">
                    <div className="crypto-grid">
                        {sortedCryptos.length > 0 ? (
                            sortedCryptos.map((crypto, index) => (
                                <div 
                                    key={index} 
                                    className={`crypto-card ${favorites.includes(crypto.symbol) ? "favorited" : ""} ${priceChanges[crypto.symbol] || ''}`}
                                >
                                    <h3>{crypto.symbol}</h3>
                                    <p className="price">${parseFloat(crypto.price).toFixed(4)}</p>
                                    <button
                                        className={`favorite-button ${favorites.includes(crypto.symbol) ? "favorited" : ""}`}
                                        onClick={() => toggleFavorite(crypto.symbol)}
                                    >
                                        <FaStar />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p>Nenhuma moeda encontrada...</p>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
