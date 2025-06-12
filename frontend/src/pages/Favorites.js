import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Layout from "../components/Layout";
import { FaStar } from "react-icons/fa";
import CryptoModal from "../components/CryptoModal";
import CryptoBackground from "../components/CryptoBackground";
import axios from "axios";
import "./Favorites.css";

const SERVER_URL = process.env.REACT_APP_API_URL;

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
  // const reconnectTimeout = useRef(null); // Não será mais usado com a nova abordagem

  // Referência para manter a função processNewData atualizada para o WebSocket
  const processNewDataRef = useRef(null);

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

  // Função para processar novos dados do WebSocket
  const processNewData = useCallback(
    (data) => {
      if (!Array.isArray(data)) {
        console.warn(
          "[Favorites WebSocket processNewData] Dados inválidos ou não é array."
        );
        return;
      }

      setFavorites((prevFavorites) => {
        const newPriceDataMap = new Map();
        data.forEach((item) => {
          if (item && item.symbol && item.price && item.exchangeId) {
            const favoriteId = `${item.symbol}_${item.exchangeId}`;
            newPriceDataMap.set(favoriteId, parseFloat(item.price));
          }
        });

        if (newPriceDataMap.size === 0) return prevFavorites; // Nenhum dado relevante

        let changesMade = false;
        const updatedFavorites = prevFavorites.map((fav) => {
          const favoriteId = fav.id || `${fav.symbol}_${fav.exchangeId}`; // Garante que temos um ID
          const newPrice = newPriceDataMap.get(favoriteId);

          if (newPrice !== undefined && fav.current_price !== newPrice) {
            changesMade = true;
            const oldPrice = fav.current_price;

            setPriceChanges((prev) => ({
              ...prev,
              [favoriteId]: newPrice > oldPrice ? "up" : "down",
            }));

            setTimeout(() => {
              setPriceChanges((prev) => {
                const updated = { ...prev };
                delete updated[favoriteId];
                return updated;
              });
            }, 1000); // Duração do destaque da mudança de preço

            return { ...fav, current_price: newPrice };
          }
          return fav;
        });

        return changesMade ? updatedFavorites : prevFavorites;
      });
    },
    [setFavorites, setPriceChanges]
  );

  // Efeito para atualizar a referência de processNewData quando ela mudar
  useEffect(() => {
    processNewDataRef.current = processNewData;
  }, [processNewData]); // A dependência é a própria função processNewData

  // 🔥 WebSocket para atualizar os preços em tempo real (Refatorado)
  useEffect(() => {
    // A função processNewData é estável devido ao useCallback e sua ref é atualizada em outro useEffect
    // Portanto, não precisamos incluí-la ou selectedExchangeRef.current nas dependências aqui.
    console.log(
      `[Favorites WebSocket Setup useEffect] Configurando WebSocket. Servidor: ${SERVER_URL}`
    );

    // Função para fechar a conexão WebSocket existente de forma segura
    const closeExistingSocket = () => {
      if (ws.current) {
        console.log(
          `[Favorites WebSocket Cleanup] Tentando fechar conexão WebSocket existente. Estado: ${ws.current.readyState}`
        );
        if (
          ws.current.readyState === WebSocket.OPEN ||
          ws.current.readyState === WebSocket.CONNECTING
        ) {
          ws.current.close(1000, "Reconfiguring WebSocket for Favorites");
          console.log("[Favorites WebSocket Cleanup] Comando close enviado.");
        } else {
          console.log(
            "[Favorites WebSocket Cleanup] Conexão existente não estava OPEN ou CONNECTING, não fechando ativamente."
          );
        }
        ws.current = null;
      }
    };

    closeExistingSocket(); // Fechar qualquer socket existente antes de criar um novo

    // Só prosseguir para criar um novo socket se ws.current for de fato null agora
    // e SERVER_URL for válido.
    if (!SERVER_URL) {
      console.warn(
        "[Favorites WebSocket Setup] SERVER_URL não definido. WebSocket não será conectado."
      );
      return;
    }

    console.log(
      "[Favorites WebSocket Setup] Criando nova instância WebSocket..."
    );
    const socket = new WebSocket(`wss://${SERVER_URL}/ws`);
    ws.current = socket; // Atribui o novo socket à ref imediatamente

    socket.onopen = () => {
      if (ws.current !== socket) {
        console.log(
          "🔗 [Favorites] WebSocket onopen para socket obsoleto. Ignorando."
        );
        socket.close(1000, "Obsolete socket onopen"); // Fechar o socket obsoleto
        return;
      }
      console.log("🔗 [Favorites] WebSocket conectado.");
    };

    socket.onmessage = (event) => {
      if (ws.current !== socket) {
        console.log(
          "📩 [Favorites] WebSocket onmessage para socket obsoleto. Ignorando."
        );
        // Não precisa fechar aqui, pois o onclose do obsoleto deve cuidar disso
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (processNewDataRef.current) {
          processNewDataRef.current(data);
        }
      } catch (error) {
        console.error(
          "Erro ao processar dados do WebSocket em Favorites:",
          error
        );
      }
    };

    socket.onerror = (errorEvent) => {
      // Se este socket não é mais o atual, logue e possivelmente feche se não estiver já fechado.
      if (ws.current !== socket) {
        console.error(
          `[Favorites WebSocket onerror] Erro em socket obsoleto (estado: ${socket.readyState}):`,
          errorEvent
        );
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close(1006, "Obsolete socket onerror");
        }
        return;
      }
      console.error("[Favorites WebSocket onerror] Erro:", errorEvent);
      // Poderia adicionar lógica para atualizar o status da UI aqui, se necessário
    };

    socket.onclose = (event) => {
      // Se este socket não é mais o atual, apenas logue.
      if (ws.current !== socket && ws.current !== null) {
        // ws.current !== null verifica se não estamos limpando o socket atual
        console.log(
          `⚠️ [Favorites] WebSocket onclose para socket obsoleto (novo ws.current: ${
            ws.current ? ws.current.url : "null"
          }). Code: ${event.code}, Reason: ${event.reason}`
        );
        return;
      }
      // Se ws.current é este socket, OU se ws.current se tornou null porque este é o socket
      // que está sendo limpo pela função de retorno do useEffect.
      console.log(
        `⚠️ [Favorites] WebSocket desconectado. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`
      );
      // Se o socket que está fechando é o socket atual na ref, definimos a ref como null.
      // Isso é importante para permitir que uma nova conexão seja estabelecida se necessário,
      // e para que a lógica de "socket obsoleto" funcione corretamente.
      if (ws.current === socket) {
        ws.current = null;
      }
      // Não tentar reconectar automaticamente aqui. A lógica de remontagem/mudança de SERVER_URL cuidará disso.
    };

    return () => {
      console.log(
        `[Favorites WebSocket Cleanup Effect] Limpando para socket: ${socket.url}`
      );
      if (ws.current === socket) {
        // Se o socket na ref ainda é este que o cleanup está direcionando
        console.log(
          "[Favorites WebSocket Cleanup Effect] ws.current é o socket atual. Fechando e definindo como null."
        );
        socket.close(
          1000,
          "Componente Favorites desmontado ou SERVER_URL mudou"
        );
        ws.current = null;
      } else if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        // Se o socket não é o ws.current (ou seja, ws.current mudou para um novo socket),
        // mas este socket antigo ainda está aberto ou conectando, devemos fechá-lo.
        console.log(
          `[Favorites WebSocket Cleanup Effect] Este socket (url: ${
            socket.url
          }) não é o ws.current (atual: ${
            ws.current ? ws.current.url : "null"
          }), mas ainda está ${socket.readyState}. Fechando.`
        );
        socket.close(1000, "Limpando socket antigo no Favorites");
      } else {
        console.log(
          `[Favorites WebSocket Cleanup Effect] Este socket (url: ${socket.url}) não é o ws.current e já está no estado ${socket.readyState}. Nenhuma ação de fechamento explícito.`
        );
      }
    };
  }, [SERVER_URL]); // Dependência principal: recria o WebSocket se SERVER_URL mudar.

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
        `${SERVER_URL}/api/${exchangeToFetch}/ticker/${encodeURIComponent(
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
                className={`favorites-card ${priceChanges[coin.id] || ""}`}
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
