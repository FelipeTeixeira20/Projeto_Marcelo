import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";
import CryptoBackground from "../components/CryptoBackground"; // 🔥 Voltando com o fundo animado
import axios from "axios";
import { FaStar } from "react-icons/fa";
import "./Dashboard.css";
import CryptoModal from "../components/CryptoModal"; // Adicione este import

const SERVER_URL =
  window.location.hostname === "192.168.100.26"
    ? "192.168.100.26"
    : window.location.hostname;

const ITEMS_PER_PAGE = 20; // 🔥 Número de cards carregados por vez

// 🔥 Lista de exchanges disponíveis
const exchanges = [
  { id: "mexc", name: "MEXC", color: "#FF0000" },
  { id: "binance", name: "Binance", color: "#F3BA2F" },
  { id: "bitget", name: "Bitget", color: "#00FF7F" },
  { id: "gateio", name: "Gate.io", color: "#00AA00" },
  { id: "kucoin", name: "KuCoin", color: "#0052FF" },
];

const Dashboard = () => {
  const [cryptos, setCryptos] = useState([]);
  const [visibleCryptos, setVisibleCryptos] = useState(ITEMS_PER_PAGE);
  const [favorites, setFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [wsStatus, setWsStatus] = useState("⭕ Desconectado");
  const [priceChanges, setPriceChanges] = useState({});
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [selectedExchange, setSelectedExchange] = useState(exchanges[0]); // MEXC como padrão
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ws = useRef(null);
  const observer = useRef();

  // Função auxiliar para obter o nome do usuário logado
  const getLoggedInUsername = () => {
    return (
      localStorage.getItem("username") || sessionStorage.getItem("username")
    );
  };

  // 🔥 Função para buscar dados iniciais da API da exchange selecionada
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setCryptos([]); // Limpar cryptos imediatamente ao iniciar a carga
      setPriceChanges({}); // Limpar alterações de preço anteriores
      console.log(`Buscando dados da ${selectedExchange.name}...`);

      // Busca dados da exchange selecionada
      const response = await axios.get(
        `http://${SERVER_URL}:5000/api/${selectedExchange.id}/spot/prices`
      );

      console.log(
        `Resposta recebida da ${selectedExchange.name}:`,
        response.data
      );

      // Verificar se a resposta é um array
      if (!Array.isArray(response.data)) {
        console.error(
          `Resposta inválida da ${selectedExchange.name}: não é um array`,
          response.data
        );
        throw new Error(
          `Resposta inválida da ${selectedExchange.name}: não é um array`
        );
      }

      // Filtrar dados inválidos - remover dados sem símbolo ou preço
      const validData = response.data.filter(
        (crypto) =>
          crypto &&
          crypto.symbol &&
          crypto.price &&
          !isNaN(parseFloat(crypto.price)) &&
          parseFloat(crypto.price) > 0 // Remover preços zero
      );

      console.log(
        `Dados válidos filtrados (${validData.length} itens):`,
        validData.slice(0, 3)
      );

      // Verificar se temos dados válidos
      if (validData.length === 0) {
        console.warn(`Nenhum dado válido recebido da ${selectedExchange.name}`);

        // Verificar se os dados originais tinham algum conteúdo
        const totalOriginalItems = Array.isArray(response.data)
          ? response.data.length
          : 0;

        // Mensagem específica com base no que aconteceu
        let errorMsg = `Nenhum dado válido recebido da ${selectedExchange.name}.`;

        if (totalOriginalItems > 0) {
          errorMsg += ` Foram recebidos ${totalOriginalItems} itens, mas todos foram filtrados por terem preços inválidos ou zeros.`;
        } else {
          errorMsg += ` A API retornou uma resposta vazia.`;
        }

        errorMsg += ` Tentando encontrar outra corretora disponível...`;

        setCryptos([
          {
            error: errorMsg,
            exchangeId: selectedExchange.id,
          },
        ]);

        // Tentar outra corretora automaticamente
        tryNextExchange().then((success) => {
          if (!success) {
            setCryptos([
              {
                error: `A API da ${selectedExchange.name} está temporariamente indisponível (404). Nenhuma alternativa encontrada.`,
                exchangeId: selectedExchange.id,
              },
            ]);
          }
        });
        setLoading(false);
        return;
      }

      // Adicionar uma tag para identificar a corretora de origem e remover qualquer dado antigo
      const processedData = validData.map((crypto) => ({
        ...crypto,
        id: `${crypto.symbol}_${selectedExchange.id}`, // ID único para o card
        exchangeId: selectedExchange.id,
        exchangeName: selectedExchange.name,
        exchangeColor: selectedExchange.color, // Cor específica da exchange do card
        prevPrice: parseFloat(crypto.price),
        priceChange: null,
      }));

      console.log(`Dados processados (${processedData.length} itens)`);

      // Importante: limpe completamente os dados antigos para evitar mistura
      setCryptos(processedData);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error(
        `Erro ao buscar dados da ${selectedExchange.name}:`,
        error.message
      );

      // Mensagem específica para mostrar ao usuário
      let userError = "";
      if (error.response) {
        if (error.response.status === 404) {
          userError = `A API da ${selectedExchange.name} está temporariamente indisponível (404). Tentando outra corretora...`;

          // Tentar outra corretora automaticamente
          tryNextExchange().then((success) => {
            if (!success) {
              setCryptos([
                {
                  error: `A API da ${selectedExchange.name} está temporariamente indisponível (404). Nenhuma alternativa encontrada.`,
                  exchangeId: selectedExchange.id,
                },
              ]);
            }
          });
        } else {
          userError = `Erro ${error.response.status} ao acessar a API da ${selectedExchange.name}.`;
        }
      } else if (error.request) {
        userError = `Não foi possível conectar ao servidor. Verificando alternativas...`;

        // Tentar outra corretora automaticamente
        tryNextExchange().then((success) => {
          if (!success) {
            setCryptos([
              {
                error: `Não foi possível conectar ao servidor. Nenhuma alternativa disponível.`,
                exchangeId: selectedExchange.id,
              },
            ]);
          }
        });
      } else {
        userError = `Erro ao processar dados da ${selectedExchange.name}: ${error.message}`;
      }

      console.warn(`Definindo mensagem de erro: ${userError}`);

      // Salvar o erro para exibir na interface
      setCryptos([{ error: userError, exchangeId: selectedExchange.id }]);
      setLoading(false);
    }
  };

  // 🔥 Função para processar atualizações em tempo real
  const processNewData = useCallback(
    (newData) => {
      if (!newData || !Array.isArray(newData)) {
        console.warn("Dados inválidos recebidos do WebSocket");
        return;
      }

      // Registrar a recepção de dados para depuração
      console.log(
        `WebSocket: recebidos ${newData.length} itens, filtrando para ${selectedExchange.id}`
      );

      // Filtrar rigorosamente apenas para o exchange selecionado
      const filteredData = newData.filter(
        (item) =>
          item &&
          item.symbol &&
          item.price &&
          // Garantir que o item pertence ao exchange atual
          ((item.exchangeId && item.exchangeId === selectedExchange.id) ||
            // Ou não tem exchangeId (mas será atribuído abaixo)
            (!item.exchangeId && selectedExchange.id === "mexc")) // Compatibilidade com dados antigos da MEXC
      );

      if (filteredData.length === 0) {
        console.log(
          `WebSocket: nenhum item válido para ${selectedExchange.id} após filtragem`
        );
        return; // Sem dados relevantes para o exchange atual
      }

      console.log(
        `WebSocket: processando ${filteredData.length} itens para ${selectedExchange.id}`
      );

      // Para manter controle das mudanças de preço
      const changes = {};

      setCryptos((prevCryptos) => {
        // Se não temos dados anteriores, usamos os novos diretamente
        if (!prevCryptos || prevCryptos.length === 0) {
          const newData = filteredData.map((crypto) => ({
            ...crypto,
            prevPrice: parseFloat(crypto.price),
            priceChange: 0,
            exchangeId: selectedExchange.id, // Garantir que tem exchangeId correto
            exchangeName: selectedExchange.name,
          }));

          console.log(
            `WebSocket: inicializando ${newData.length} itens para ${selectedExchange.name}`
          );
          return newData;
        }

        // Atualizar apenas as criptos do exchange atual
        const currentExchangeCryptos = prevCryptos.filter(
          (c) => c.exchangeId === selectedExchange.id
        );

        // Atualizar os preços mantendo os metadados
        const updatedCryptos = currentExchangeCryptos.map((prevCrypto) => {
          const newCrypto = filteredData.find(
            (c) => c.symbol === prevCrypto.symbol
          );

          if (!newCrypto) {
            return prevCrypto; // Manter o que tínhamos se não houver atualização
          }

          const newPrice = parseFloat(newCrypto.price);
          const prevPrice = parseFloat(prevCrypto.price);

          // Registrar mudança para efeitos visuais se o preço mudou
          if (newPrice !== prevPrice) {
            changes[prevCrypto.symbol] = newPrice > prevPrice ? "up" : "down";
            console.log(
              `${prevCrypto.symbol}: ${prevPrice} → ${newPrice} (${
                changes[prevCrypto.symbol]
              })`
            );
          }

          return {
            ...prevCrypto,
            ...newCrypto,
            prevPrice: prevPrice,
            price: newPrice,
            exchangeId: selectedExchange.id, // Garantir que mantém exchangeId correto
            exchangeName: selectedExchange.name,
            priceChange:
              newPrice > prevPrice
                ? "up"
                : newPrice < prevPrice
                ? "down"
                : "same",
          };
        });

        // Filtrar criptos de outras exchanges que devem ser mantidas
        const otherExchangeCryptos = prevCryptos.filter(
          (c) => c.exchangeId !== selectedExchange.id
        );

        // Encontrar novas criptomoedas que não estavam na lista anterior
        const existingSymbols = new Set(
          currentExchangeCryptos.map((c) => c.symbol)
        );
        const newCryptos = filteredData
          .filter((c) => !existingSymbols.has(c.symbol))
          .map((crypto) => ({
            ...crypto,
            prevPrice: parseFloat(crypto.price),
            priceChange: 0,
            exchangeId: selectedExchange.id, // Garantir consistência
            exchangeName: selectedExchange.name,
          }));

        // Apenas adicionar cryptos da exchange atual
        const result = [...updatedCryptos, ...newCryptos];

        // Log para verificar se estamos tendo problemas de mixagem
        if (otherExchangeCryptos.length > 0) {
          console.warn(
            `WebSocket: detectadas ${otherExchangeCryptos.length} criptos de outras exchanges que não serão atualizadas`
          );
        }

        return result;
      });

      // Atualizar as mudanças visuais se houver mudanças
      if (Object.keys(changes).length > 0) {
        console.log(
          `Atualizando ${
            Object.keys(changes).length
          } preços com efeitos visuais`
        );
        setPriceChanges(changes);
        setLastUpdate(new Date());

        // Limpar os efeitos visuais após 1 segundo
        setTimeout(() => {
          setPriceChanges({});
        }, 1000);
      }
    },
    [selectedExchange]
  );

  // 🔥 Conectar ao WebSocket para atualizações em tempo real
  const connectWebSocket = useCallback(() => {
    console.log(
      `Conectando ao WebSocket para o exchange: ${selectedExchange.name}`
    );

    // Fechar qualquer conexão existente
    if (ws.current) {
      ws.current.close();
    }

    // Conectar ao servidor WebSocket
    ws.current = new WebSocket(`ws://${SERVER_URL}:5000/ws`);

    ws.current.onopen = () => {
      console.log(`WebSocket conectado para ${selectedExchange.name}`);
      setError("");
      setWsStatus("🟢 Conectado");
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && Array.isArray(data)) {
          console.log(`WebSocket: recebidos ${data.length} itens`);
          processNewData(data);
        }
      } catch (e) {
        console.error("Erro ao processar mensagem do WebSocket:", e);
      }
    };

    ws.current.onerror = (error) => {
      console.error(`Erro de WebSocket para ${selectedExchange.name}:`, error);
      setError(`Erro na conexão WebSocket. Tente novamente mais tarde.`);
      setWsStatus("🔴 Erro na conexão");
    };

    ws.current.onclose = () => {
      console.log(`WebSocket desconectado para ${selectedExchange.name}`);
      setWsStatus("⭕ Desconectado");
    };
  }, [selectedExchange, processNewData]);

  // useEffect para carregar dados iniciais
  useEffect(() => {
    console.log(`Carregando dados iniciais para ${selectedExchange.name}`);
    fetchInitialData();
  }, [selectedExchange]);

  // useEffect separado para conexão WebSocket
  useEffect(() => {
    console.log("Conectando WebSocket para atualizações em tempo real...");
    connectWebSocket();

    // Limpar a conexão quando o componente for desmontado
    return () => {
      console.log("Fechando conexão WebSocket...");
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connectWebSocket]);

  // Forçar binance como seleção inicial e buscar dados ao montar o componente
  useEffect(() => {
    // Começar com a Binance
    const binanceExchange = exchanges.find((ex) => ex.id === "binance");
    if (binanceExchange) {
      setSelectedExchange(binanceExchange);
    }
  }, []);

  // Função para tentar outras corretoras se a atual falhar
  const tryNextExchange = useCallback(async () => {
    // Tentar todas as corretoras em ordem, começando com Binance (geralmente mais estável)
    const exchangeOrder = ["binance", "kucoin", "gateio", "bitget", "mexc"];

    // Remover a corretora atual da lista
    const remainingExchanges = exchangeOrder.filter(
      (id) => id !== selectedExchange.id
    );

    console.log(`Tentando encontrar uma corretora disponível...`);

    // Verificar cada corretora
    for (const exchangeId of remainingExchanges) {
      try {
        console.log(`Verificando disponibilidade de ${exchangeId}...`);

        // Verificar se a API da corretora está respondendo
        const testResponse = await axios.get(
          `http://${SERVER_URL}:5000/api/${exchangeId}/spot/prices`,
          { timeout: 5000 } // Timeout de 5 segundos
        );

        // Se a resposta for um array com pelo menos um item com preço
        if (
          Array.isArray(testResponse.data) &&
          testResponse.data.length > 0 &&
          testResponse.data.some(
            (item) => item && item.price && parseFloat(item.price) > 0
          )
        ) {
          console.log(`Corretora ${exchangeId} disponível! Alternando...`);

          // Alternar para esta corretora
          const exchange = exchanges.find((ex) => ex.id === exchangeId);
          if (exchange) {
            setSelectedExchange(exchange);
            return true;
          }
        }
      } catch (error) {
        console.log(`Corretora ${exchangeId} indisponível:`, error.message);
      }
    }

    console.log("Nenhuma corretora disponível encontrada");
    return false;
  }, [selectedExchange]);

  // 🔥 Lazy Loading: Carrega mais cards ao rolar a tela
  const lastCryptoElementRef = useCallback(
    (node) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && cryptos.length > 0 && !loading) {
          setVisibleCryptos((prev) => prev + ITEMS_PER_PAGE);
        }
      });
      if (node) observer.current.observe(node);
    },
    [cryptos.length, loading]
  );

  const toggleFavorite = (cryptoData) => {
    const username = getLoggedInUsername();
    if (!username) return;
    const favoritesKey = `favorites_${username}`;

    const favoriteId = `${cryptoData.symbol}_${cryptoData.exchangeId}`;

    setFavorites((prev) => {
      const isCurrentlyFavoriteInState = prev.some(
        (fav) => fav.id === favoriteId
      );
      let newFavoritesState;

      if (isCurrentlyFavoriteInState) {
        newFavoritesState = prev.filter((fav) => fav.id !== favoriteId);
      } else {
        newFavoritesState = [
          ...prev,
          {
            id: favoriteId,
            symbol: cryptoData.symbol,
            exchangeId: cryptoData.exchangeId,
          },
        ];
      }

      const storedUserFavorites =
        JSON.parse(localStorage.getItem(favoritesKey)) || [];
      if (isCurrentlyFavoriteInState) {
        // Significa que queremos remover do localStorage
        const updatedUserFavorites = storedUserFavorites.filter(
          (fav) =>
            !(
              fav.symbol === cryptoData.symbol &&
              fav.exchangeId === cryptoData.exchangeId
            )
        );
        localStorage.setItem(
          favoritesKey,
          JSON.stringify(updatedUserFavorites)
        );
      } else {
        // Significa que queremos adicionar ao localStorage
        const favoriteToStore = {
          id: favoriteId,
          symbol: cryptoData.symbol,
          name: cryptoData.name || cryptoData.symbol,
          image:
            cryptoData.image ||
            `https://s2.coinmarketcap.com/static/img/coins/64x64/${
              cryptoData.id || "1"
            }.png`,
          current_price: parseFloat(cryptoData.price),
          exchangeId: cryptoData.exchangeId,
          exchangeName: cryptoData.exchangeName,
          // Adicionar exchangeColor ao objeto salvo se cryptoData tiver, ou buscar em 'exchanges'
          exchangeColor:
            cryptoData.exchangeColor ||
            (exchanges.find((ex) => ex.id === cryptoData.exchangeId) || {})
              .color,
        };
        // Evitar duplicatas no localStorage
        const itemExistsInStorage = storedUserFavorites.some(
          (fav) => fav.id === favoriteId
        );
        if (!itemExistsInStorage) {
          localStorage.setItem(
            favoritesKey,
            JSON.stringify([...storedUserFavorites, favoriteToStore])
          );
        } else {
          // Opcional: Atualizar o item existente se necessário, por exemplo, o preço.
          // Por agora, apenas não adicionamos duplicado.
          console.warn(
            "Favorito já existe no localStorage, não adicionando duplicata."
          );
        }
      }
      return newFavoritesState;
    });
  };

  useEffect(() => {
    const username = getLoggedInUsername();
    if (!username) return;
    const favoritesKey = `favorites_${username}`;
    const storedUserFavorites =
      JSON.parse(localStorage.getItem(favoritesKey)) || [];

    // Garantir unicidade usando Map pelo 'id' composto e que 'id' está presente
    const uniqueFavorites = Array.from(
      new Map(
        storedUserFavorites.map((item) => [
          item.id || `${item.symbol}_${item.exchangeId}`, // Chave do Map
          {
            ...item,
            id: item.id || `${item.symbol}_${item.exchangeId}`, // Valor do Map, garantindo 'id'
            // Assegurar que os campos necessários para o estado do Dashboard (id, symbol, exchangeId) estão aqui
            symbol: item.symbol,
            exchangeId: item.exchangeId,
          },
        ])
      ).values()
    );

    setFavorites(
      uniqueFavorites.map((fav) => ({
        id: fav.id,
        symbol: fav.symbol,
        exchangeId: fav.exchangeId,
      }))
    );
  }, []);

  // 🔄 Filtrando criptomoedas conforme a busca e verificando se pertence à corretora atual
  const filteredCryptos = cryptos.filter(
    (crypto) =>
      // Ignorar objetos de erro
      !crypto.error &&
      // Verificar se crypto é um objeto válido
      crypto &&
      typeof crypto === "object" &&
      // Verificar se é da corretora atual
      crypto.exchangeId === selectedExchange.id &&
      // Filtro de busca - verificar se symbol existe antes de chamar toLowerCase
      crypto.symbol &&
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Log para debug
  useEffect(() => {
    console.log(`Total de cryptos carregadas: ${cryptos.length}`);
    console.log(`Total de cryptos filtradas: ${filteredCryptos.length}`);

    // Verificar se há objetos de erro
    const errors = cryptos.filter((c) => c.error);
    if (errors.length > 0) {
      console.log("Erros encontrados:", errors);
    }

    // Verificar se há dados inválidos
    cryptos.forEach((c, index) => {
      if (!c.symbol && !c.error) {
        console.warn(`Crypto ${index} inválida:`, c);
      }
    });
  }, [cryptos, filteredCryptos, selectedExchange.id]);

  // 🔄 Ordenação das criptomoedas
  const sortedCryptos = [...filteredCryptos]
    // Garantir que apenas criptos da corretora atual sejam consideradas
    .filter((crypto) => crypto.exchangeId === selectedExchange.id)
    .sort((a, b) => {
      // Converter para números antes de comparar para evitar erros
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;

      if (sortOption === "price-asc") return priceA - priceB;
      if (sortOption === "price-desc") return priceB - priceA;
      if (sortOption === "alphabetical")
        return a.symbol.localeCompare(b.symbol);
      return 0;
    });

  // Log após ordenação
  useEffect(() => {
    console.log(`Total de cryptos ordenadas: ${sortedCryptos.length}`);
    console.log("Primeiras 3 cryptos ordenadas:", sortedCryptos.slice(0, 3));
  }, [sortedCryptos]);

  // Depuração de inconsistências de exchange
  useEffect(() => {
    // Verificar se há criptomoedas com exchangeId diferente do selecionado
    const wrongExchange = cryptos.filter(
      (c) => c.exchangeId && c.exchangeId !== selectedExchange.id && !c.error
    );

    if (wrongExchange.length > 0) {
      console.warn(
        `Encontradas ${wrongExchange.length} criptomoedas de exchanges diferentes da selecionada:`
      );
      console.warn(
        `Exchange atual: ${selectedExchange.id}, criptomoedas encontradas:`,
        wrongExchange.map((c) => `${c.symbol} (${c.exchangeId})`).slice(0, 5)
      );
    }
  }, [cryptos, selectedExchange.id]);

  const handleCardClick = async (symbol) => {
    // Verificar se a moeda pertence à corretora atual
    const cryptoData = cryptos.find((c) => c.symbol === symbol);

    if (!cryptoData) {
      setSelectedCrypto({
        symbol,
        exchange: selectedExchange.name,
        error: `Moeda ${symbol} não encontrada na corretora ${selectedExchange.name}`,
      });
      return;
    }

    try {
      setSelectedCrypto({
        symbol,
        loading: true,
        exchange: selectedExchange.name,
      });

      const response = await axios.get(
        `http://${SERVER_URL}:5000/api/${
          selectedExchange.id
        }/ticker/${encodeURIComponent(symbol)}`
      );
      const tickerData = response.data;

      // Verificar se a resposta é válida
      if (!tickerData) {
        throw new Error("Dados inválidos recebidos da API");
      }

      // Mapeamento de campos por corretora
      let mappedData = {
        symbol,
        exchange: selectedExchange.name,
      };

      // Dependendo da corretora, os campos de resposta da API podem ter nomes diferentes
      switch (selectedExchange.id) {
        case "binance":
          mappedData = {
            ...mappedData,
            price: tickerData.lastPrice || tickerData.price,
            lastPrice: tickerData.lastPrice || tickerData.price,
            highPrice:
              tickerData.highPrice ||
              tickerData.high_24h ||
              tickerData.high ||
              "0",
            lowPrice:
              tickerData.lowPrice ||
              tickerData.low_24h ||
              tickerData.low ||
              "0",
            volume: tickerData.volume || tickerData.baseVolume || "0",
            amount: tickerData.quoteVolume || "0",
          };
          break;
        case "mexc":
          mappedData = {
            ...mappedData,
            price: tickerData.lastPrice,
            lastPrice: tickerData.lastPrice,
            highPrice: tickerData.highPrice,
            lowPrice: tickerData.lowPrice,
            volume: tickerData.volume,
            amount: tickerData.quoteVolume,
          };
          break;
        case "bitget":
          mappedData = {
            ...mappedData,
            price: tickerData.lastPrice || tickerData.close,
            lastPrice: tickerData.lastPrice || tickerData.close,
            highPrice: tickerData.highPrice || tickerData.high24h,
            lowPrice: tickerData.lowPrice || tickerData.low24h,
            volume: tickerData.volume || tickerData.baseVolume,
            amount:
              tickerData.quoteVolume ||
              tickerData.quoteVolume ||
              tickerData.usdtVolume,
          };
          break;
        case "gateio":
          mappedData = {
            ...mappedData,
            price: tickerData.last || tickerData.last_price,
            lastPrice: tickerData.last || tickerData.last_price,
            highPrice: tickerData.high_24h || tickerData.high,
            lowPrice: tickerData.low_24h || tickerData.low,
            volume: tickerData.base_volume || tickerData.volume,
            amount: tickerData.quote_volume || tickerData.volume_usd,
          };
          break;
        case "kucoin":
          mappedData = {
            ...mappedData,
            price: tickerData.last || tickerData.lastPrice,
            lastPrice: tickerData.last || tickerData.lastPrice,
            highPrice: tickerData.high || tickerData.highPrice,
            lowPrice: tickerData.low || tickerData.lowPrice,
            volume: tickerData.vol || tickerData.volume,
            amount: tickerData.volValue || tickerData.quoteVolume,
          };
          break;
        default:
          // Fallback para qualquer estrutura
          mappedData = {
            ...mappedData,
            price:
              tickerData.lastPrice || tickerData.last || tickerData.price || 0,
            lastPrice:
              tickerData.lastPrice || tickerData.last || tickerData.price || 0,
            highPrice:
              tickerData.highPrice ||
              tickerData.high ||
              tickerData.high24h ||
              0,
            lowPrice:
              tickerData.lowPrice || tickerData.low || tickerData.low24h || 0,
            volume:
              tickerData.volume || tickerData.vol || tickerData.baseVolume || 0,
            amount:
              tickerData.quoteVolume ||
              tickerData.volValue ||
              tickerData.amount ||
              0,
          };
      }

      // Para depuração, mostrar os dados no console
      console.log(
        `Dados da ${selectedExchange.name} para ${symbol}:`,
        tickerData
      );
      console.log("Dados mapeados:", mappedData);

      setSelectedCrypto(mappedData);
    } catch (error) {
      console.error("Error fetching ticker data:", error);

      // Mensagem de erro mais específica com base no código de status
      let errorMessage = "Erro ao carregar dados detalhados";

      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = `O símbolo "${symbol}" não existe na corretora ${selectedExchange.name}`;
        } else if (error.response.status === 404) {
          errorMessage = `Endpoint não disponível para ${selectedExchange.name}`;
        } else if (error.response.status >= 500) {
          errorMessage = `Erro no servidor da ${selectedExchange.name} (${error.response.status})`;
        }
      } else if (error.request) {
        errorMessage = `Sem resposta do servidor da ${selectedExchange.name}`;
      }

      setSelectedCrypto({
        symbol,
        exchange: selectedExchange.name,
        error: errorMessage,
      });
    }
  };

  // Função para limpar os dados quando mudar a exchange
  const handleExchangeChange = (e) => {
    const exchangeId = e.target.value;
    const exchange = exchanges.find((ex) => ex.id === exchangeId);

    // Limpar dados completamente antes de mudar
    setCryptos([]);
    setPriceChanges({});
    setVisibleCryptos(ITEMS_PER_PAGE);

    // Atualizar a exchange selecionada (isso disparará o fetchInitialData via useEffect)
    setSelectedExchange(exchange);

    console.log(
      `Troca de exchange para ${exchange.name} (${exchange.id}): todos os dados anteriores foram limpos`
    );
  };

  const modalCloseHandler = () => {
    setSelectedCrypto(null);
  };

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
          <p className="exchange-indicator">
            Corretora:{" "}
            <strong style={{ color: selectedExchange.color }}>
              {selectedExchange.name}
            </strong>
          </p>
          <p className="ws-status">
            Status: {wsStatus} {loading && "⏳"}
          </p>
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
          <select
            className="search-input exchange-select"
            value={selectedExchange.id}
            onChange={handleExchangeChange}
          >
            {exchanges.map((exchange) => (
              <option key={exchange.id} value={exchange.id}>
                {exchange.name}
              </option>
            ))}
          </select>
        </div>

        <div className="crypto-container">
          {loading ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Carregando dados da {selectedExchange.name}...</p>
              <small>Aguarde enquanto conectamos à API da corretora</small>
            </div>
          ) : (
            <div className="crypto-grid">
              {cryptos.length === 0 ? (
                <div className="no-data-message">
                  <p>Aguardando dados da {selectedExchange.name}.</p>
                  <button className="retry-button" onClick={fetchInitialData}>
                    Tentar novamente
                  </button>
                </div>
              ) : cryptos.some((c) => c.error) ? (
                <div className="error-message">
                  <p>
                    {cryptos.find((c) => c.error)?.error ||
                      `Erro ao obter dados da ${selectedExchange.name}`}
                  </p>
                  <div className="error-actions">
                    <button className="retry-button" onClick={fetchInitialData}>
                      Tentar novamente
                    </button>
                    <button
                      className="retry-button alternative-button"
                      onClick={tryNextExchange}
                    >
                      Procurar corretora disponível
                    </button>
                    <select
                      className="exchange-select error-select"
                      value={selectedExchange.id}
                      onChange={handleExchangeChange}
                    >
                      {exchanges.map((exchange) => (
                        <option key={exchange.id} value={exchange.id}>
                          Mudar para {exchange.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : sortedCryptos.length === 0 ? (
                <div className="no-data-message">
                  <p>
                    Nenhuma criptomoeda encontrada para {selectedExchange.name}.
                    {searchTerm &&
                      ` A busca por "${searchTerm}" não retornou resultados.`}
                  </p>
                  {searchTerm && (
                    <button
                      className="retry-button"
                      onClick={() => setSearchTerm("")}
                    >
                      Limpar busca
                    </button>
                  )}
                  <button className="retry-button" onClick={fetchInitialData}>
                    Atualizar dados
                  </button>
                </div>
              ) : (
                sortedCryptos.slice(0, visibleCryptos).map((crypto, index) => (
                  <div
                    key={crypto.id || `${crypto.symbol}_${crypto.exchangeId}`}
                    ref={
                      index === visibleCryptos - 1 ? lastCryptoElementRef : null
                    }
                    className={`crypto-card ${
                      priceChanges[crypto.symbol] || ""
                    } ${
                      favorites.some(
                        (fav) =>
                          fav.symbol === crypto.symbol &&
                          fav.exchangeId === crypto.exchangeId
                      )
                        ? "favorited"
                        : ""
                    }`}
                    onClick={() => handleCardClick(crypto.symbol)}
                  >
                    <button
                      className="favorite-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(crypto);
                      }}
                    >
                      <FaStar />
                    </button>
                    <span
                      className="exchange-tag"
                      style={{
                        backgroundColor:
                          crypto.exchangeColor || selectedExchange.color,
                      }}
                    >
                      {crypto.exchangeName || selectedExchange.name}
                    </span>
                    <h3>{crypto.symbol}</h3>
                    <p className="price">
                      ${parseFloat(crypto.price).toFixed(4)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Adicione o modal */}
        {selectedCrypto && (
          <CryptoModal
            crypto={{
              ...selectedCrypto,
              exchangeColor: selectedExchange.color,
            }}
            onClose={modalCloseHandler}
          />
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
