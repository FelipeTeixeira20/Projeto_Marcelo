import React, { useState, useEffect, useRef, useMemo } from "react";
import Layout from "../components/Layout";
import { FaStar } from "react-icons/fa";
import CryptoModal from "../components/CryptoModal";
import CryptoBackground from "../components/CryptoBackground";
import axios from "axios";
import "./Favorites.css";

const SERVER_URL =
  window.location.hostname === "192.168.100.26"
    ? "192.168.100.26"
    : window.location.hostname;

// 🔥 Lista de exchanges disponíveis (copiada do Dashboard.js)
const exchanges = [
  { id: "mexc", name: "MEXC", color: "#FF0000" }, // Red for MEXC
  { id: "binance", name: "Binance", color: "#F3BA2F" }, // Yellow for Binance
  { id: "bitget", name: "Bitget", color: "#00FF7F" }, // Green for Bitget
  { id: "gateio", name: "Gate.io", color: "#00AA00" }, // Dark Green for Gate.io
  { id: "kucoin", name: "KuCoin", color: "#0052FF" }, // Blue for KuCoin
];

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [priceUpdates, setPriceUpdates] = useState({});
  const [priceChanges, setPriceChanges] = useState({});
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  // Novos estados para filtros e ordenação
  const [sortOption, setSortOption] = useState("");
  const [selectedExchangeName, setSelectedExchangeName] = useState("all"); // 'all' para todas as corretoras
  const [exchangesInFavorites, setExchangesInFavorites] = useState([]);

  // Função auxiliar para obter o nome do usuário logado
  const getLoggedInUsername = () => {
    return (
      localStorage.getItem("username") || sessionStorage.getItem("username")
    );
  };

  useEffect(() => {
    const loadFavorites = () => {
      const username = getLoggedInUsername();
      if (!username) {
        setFavorites([]);
        return;
      }
      try {
        const favoritesKey = `favorites_${username}`;
        let storedFavorites =
          JSON.parse(localStorage.getItem(favoritesKey)) || [];

        // Garantir unicidade usando Map pelo 'id' composto e que 'id' está presente
        // Também garante que cada favorito tenha um 'id' normalizado
        storedFavorites = Array.from(
          new Map(
            storedFavorites.map((item) => [
              item.id || `${item.symbol}_${item.exchangeId}`, // Chave do Map
              {
                ...item,
                id: item.id || `${item.symbol}_${item.exchangeId}`, // Valor do Map, garantindo 'id'
              },
            ])
          ).values()
        );

        setFavorites(storedFavorites);

        const exchanges = [
          ...new Set(
            storedFavorites.map((fav) => fav.exchangeName).filter(Boolean)
          ),
        ];
        setExchangesInFavorites(exchanges.sort());
      } catch (error) {
        console.error("Erro ao carregar favoritos:", error);
        setFavorites([]);
      }
    };

    loadFavorites();
  }, []);

  // 🔥 WebSocket para atualizar os preços em tempo real
  useEffect(() => {
    const connectWebSocket = () => {
      if (ws.current) {
        ws.current.close();
      }

      ws.current = new WebSocket(`ws://${SERVER_URL}:5000/ws`);

      ws.current.onopen = () => {
        console.log("🔗 WebSocket conectado.");
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            // Cria um mapa dos novos preços
            const newPrices = {};
            data.forEach((item) => {
              newPrices[item.symbol] = parseFloat(item.price);
            });

            // Atualiza os favoritos e detecta mudanças
            setFavorites((prevFavorites) => {
              const updatedFavorites = prevFavorites.map((fav) => {
                const newPrice = newPrices[fav.symbol];
                if (newPrice !== undefined) {
                  const oldPrice = fav.current_price;
                  // Se o preço mudou, atualiza o estado de mudança
                  if (newPrice !== oldPrice) {
                    setPriceChanges((prev) => ({
                      ...prev,
                      [fav.symbol]: newPrice > oldPrice ? "up" : "down",
                    }));

                    // Agenda a remoção do efeito
                    setTimeout(() => {
                      setPriceChanges((prev) => {
                        const updated = { ...prev };
                        delete updated[fav.symbol];
                        return updated;
                      });
                    }, 1000);
                  }

                  return {
                    ...fav,
                    current_price: newPrice,
                  };
                }
                return fav;
              });
              return updatedFavorites;
            });
          }
        } catch (error) {
          console.error("Erro ao processar dados do WebSocket:", error);
        }
      };

      ws.current.onclose = () => {
        console.log("⚠️ WebSocket desconectado. Tentando reconectar...");
        if (!reconnectTimeout.current) {
          reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
        console.log("🔌 WebSocket fechado ao sair da tela.");
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, []);

  const handleUnfavorite = (symbol, exchangeId) => {
    const username = getLoggedInUsername();
    if (!username) return;

    const favoriteIdToRemove = `${symbol}_${exchangeId}`;

    const updatedFavorites = favorites.filter(
      (fav) =>
        (fav.id || `${fav.symbol}_${fav.exchangeId}`) !== favoriteIdToRemove
    );
    setFavorites(updatedFavorites);

    const favoritesKey = `favorites_${username}`;
    // Também atualiza o localStorage, filtrando pelo ID composto
    const storedUserFavorites =
      JSON.parse(localStorage.getItem(favoritesKey)) || [];
    const updatedUserFavoritesForStorage = storedUserFavorites.filter(
      (fav) =>
        (fav.id || `${fav.symbol}_${fav.exchangeId}`) !== favoriteIdToRemove
    );
    localStorage.setItem(
      favoritesKey,
      JSON.stringify(updatedUserFavoritesForStorage)
    );
  };

  const handleCardClick = async (symbol) => {
    try {
      // Tentaremos buscar os dados da MEXC por padrão se não houver exchange no favorito
      // O ideal seria ter a exchange guardada no favorito para buscar da correta
      const favoriteData = favorites.find((f) => f.symbol === symbol);
      const exchangeToFetch =
        favoriteData?.exchangeName?.toLowerCase() || "mexc"; // Default para mexc

      setSelectedCrypto({
        symbol,
        loading: true,
        exchange: exchangeToFetch.toUpperCase(),
      });

      const response = await axios.get(
        `http://${SERVER_URL}:5000/api/${exchangeToFetch}/ticker/${encodeURIComponent(
          symbol
        )}`
      );
      const tickerData = response.data;

      setSelectedCrypto({
        symbol,
        price: tickerData.lastPrice,
        lastPrice: tickerData.lastPrice,
        highPrice: tickerData.highPrice,
        lowPrice: tickerData.lowPrice,
        volume: tickerData.volume,
        amount: tickerData.quoteVolume,
      });
    } catch (error) {
      console.error("Error fetching ticker data:", error);
    }
  };

  // Aplicar filtros e ordenação
  const processedFavorites = useMemo(() => {
    let filtered = [...favorites];

    // Filtrar por corretora
    if (selectedExchangeName !== "all") {
      filtered = filtered.filter(
        (fav) => fav.exchangeName === selectedExchangeName
      );
    }

    // Ordenar
    if (sortOption === "price-asc") {
      filtered.sort(
        (a, b) => parseFloat(a.current_price) - parseFloat(b.current_price)
      );
    } else if (sortOption === "price-desc") {
      filtered.sort(
        (a, b) => parseFloat(b.current_price) - parseFloat(a.current_price)
      );
    } else if (sortOption === "alphabetical") {
      filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    return filtered;
  }, [favorites, selectedExchangeName, sortOption]);

  return (
    <Layout>
      <CryptoBackground />

      <div className="favorites-container">
        <div className="favorites-header">
          <h2 className="favorites-title">Minhas Criptomoedas Favoritas</h2>
          <p className="favorites-count">
            Total de moedas favoritas: <span>{favorites.length}</span>
          </p>
        </div>

        {/* Controles de Filtro e Ordenação */}
        <div className="favorites-controls favorites-search-filter-container">
          {" "}
          {/* Adicionada classe do dashboard para reutilizar */}
          <select
            className="favorites-search-input" // Classe similar à do dashboard
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="">Ordenar por...</option>
            <option value="price-asc">Preço: Menor → Maior</option>
            <option value="price-desc">Preço: Maior → Menor</option>
            <option value="alphabetical">Nome: A → Z</option>
          </select>
          <select
            className="favorites-search-input favorites-exchange-select" // Classes similares às do dashboard
            value={selectedExchangeName}
            onChange={(e) => setSelectedExchangeName(e.target.value)}
          >
            <option value="all">Todas as Corretoras</option>
            {exchangesInFavorites.map((exchange) => (
              <option key={exchange} value={exchange}>
                {exchange}
              </option>
            ))}
          </select>
        </div>

        {favorites.length === 0 ? (
          <p className="empty-message">
            Você ainda não adicionou nenhuma criptomoeda aos favoritos.
          </p>
        ) : (
          <div className="favorites-grid">
            {processedFavorites.map((coin) => (
              <div
                key={coin.id || `${coin.symbol}_${coin.exchangeId}`}
                className={`favorites-card ${priceChanges[coin.symbol] || ""}`}
                onClick={() => handleCardClick(coin.symbol)}
              >
                <button
                  className="favorite-button favorited"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnfavorite(coin.symbol, coin.exchangeId);
                  }}
                >
                  <FaStar color="gold" />
                </button>
                {coin.exchangeName && (
                  <span
                    className="exchange-name"
                    style={{
                      backgroundColor:
                        exchanges.find((ex) => ex.name === coin.exchangeName)
                          ?.color || "rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    {coin.exchangeName}
                  </span>
                )}
                <h3>{coin.symbol}</h3>
                <p className="favorites-price">
                  ${parseFloat(coin.current_price).toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        )}

        {selectedCrypto && (
          <CryptoModal
            crypto={selectedCrypto}
            onClose={() => setSelectedCrypto(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default Favorites;
