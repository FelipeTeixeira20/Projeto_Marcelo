import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";
import CryptoBackground from "../components/CryptoBackground"; // 🔥 Voltando com o fundo animado
import axios from "axios";
import { FaStar } from "react-icons/fa";
import "./Dashboard.css";

const SERVER_URL =
  window.location.hostname === "192.168.100.26"
    ? "192.168.100.26"
    : window.location.hostname;

const ITEMS_PER_PAGE = 20; // 🔥 Número de cards carregados por vez

const Dashboard = () => {
  const [cryptos, setCryptos] = useState([]);
  const [visibleCryptos, setVisibleCryptos] = useState(ITEMS_PER_PAGE);
  const [favorites, setFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [wsStatus, setWsStatus] = useState("⭕ Desconectado");
  const [priceChanges, setPriceChanges] = useState({});

  const ws = useRef(null);
  const observer = useRef();

  // 🔥 Função para buscar dados iniciais da API
  const fetchInitialData = async () => {
    try {
      // Sempre usa o WebSocket da MEXC para atualizações em tempo real
      const response = await axios.get(
        `http://${SERVER_URL}:5000/api/mexc/prices`
      );
      setCryptos(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Erro ao buscar dados:", error.message);
      // Não vamos mudar o status do WebSocket quando der erro na busca inicial
      // setWsStatus("🔴 Erro ao carregar dados");
    }
  };

  // 🔥 Função para processar atualizações em tempo real
  const processNewData = useCallback((newData) => {
    setCryptos((prevCryptos) => {
      const hasChanges =
        JSON.stringify(prevCryptos) !== JSON.stringify(newData);
      if (hasChanges) {
        const changes = {};
        newData.forEach((newCrypto) => {
          const oldCrypto = prevCryptos.find(
            (c) => c.symbol === newCrypto.symbol
          );
          if (
            oldCrypto &&
            parseFloat(oldCrypto.price) !== parseFloat(newCrypto.price)
          ) {
            changes[newCrypto.symbol] =
              parseFloat(newCrypto.price) > parseFloat(oldCrypto.price)
                ? "up"
                : "down";
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

  // 🔥 Conectar ao WebSocket para atualizações em tempo real
  const connectWebSocket = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(`ws://${SERVER_URL}:5000/ws`);

      ws.current.onopen = () => {
        setWsStatus("🟢 Conectado");
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) processNewData(data);
        } catch (error) {
          console.error("Erro ao processar WebSocket:", error.message);
        }
      };

      ws.current.onclose = () => {
        setWsStatus("⭕ Desconectado");
      };

      ws.current.onerror = () => {
        setWsStatus("🔴 Erro na conexão");
      };
    } catch (error) {
      setWsStatus("🔴 Erro na configuração");
    }
  }, [processNewData]);

  // Adicione o useEffect para buscar dados quando a exchange mudar
  useEffect(() => {
    fetchInitialData();
  }, []);

  // 🔥 Lazy Loading: Carrega mais cards ao rolar a tela
  const lastCryptoElementRef = useCallback((node) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCryptos((prev) => prev + ITEMS_PER_PAGE);
      }
    });
    if (node) observer.current.observe(node);
  }, []);

  const toggleFavorite = (symbol) => {
    setFavorites((prev) =>
      prev.includes(symbol)
        ? prev.filter((fav) => fav !== symbol)
        : [...prev, symbol]
    );
  };

  // 🔍 Filtrando criptomoedas conforme a busca
  const filteredCryptos = cryptos.filter((crypto) =>
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔄 Ordenação das criptomoedas
  const sortedCryptos = [...filteredCryptos].sort((a, b) => {
    if (sortOption === "price-asc")
      return parseFloat(a.price) - parseFloat(b.price);
    if (sortOption === "price-desc")
      return parseFloat(b.price) - parseFloat(a.price);
    if (sortOption === "alphabetical") return a.symbol.localeCompare(b.symbol);
    return 0;
  });

  // Mantenha o useEffect original do WebSocket
  useEffect(() => {
    connectWebSocket();
    return () => ws.current?.close();
  }, [connectWebSocket]);

  return (
    <Layout>
      {/* 🔥 Fundo animado restaurado */}
      <CryptoBackground />

      <div className="dashboard-container">
        <h2 className="dashboard-title">Mercado de Criptomoedas</h2>
        <p className="dashboard-subtitle">
          Confira os preços atualizados das moedas
        </p>

        <div className="status-container">
          <p className="last-update">
            Última atualização:{" "}
            {lastUpdate.toLocaleTimeString("pt-BR", { hour12: false })}
          </p>
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
            className="search-input"
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
            {sortedCryptos.slice(0, visibleCryptos).map((crypto, index) => (
              <div
                key={crypto.symbol}
                ref={index === visibleCryptos - 1 ? lastCryptoElementRef : null}
                className={`crypto-card ${priceChanges[crypto.symbol] || ""} ${
                  favorites.includes(crypto.symbol) ? "favorited" : ""
                }`}
              >
                <h3>{crypto.symbol}</h3>
                <p className="price">${parseFloat(crypto.price).toFixed(4)}</p>
                <button
                  className={`favorite-button ${
                    favorites.includes(crypto.symbol) ? "favorited" : ""
                  }`}
                  onClick={() => toggleFavorite(crypto.symbol)}
                >
                  <FaStar />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
