import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import Layout from "../components/Layout";
import CryptoBackground from "../components/CryptoBackground";
import axios from "axios";
import "./MarketAnalysis.css";
import MarketRow from "../components/MarketRow";

const SERVER_URL =
  window.location.hostname === "192.168.100.26"
    ? "192.168.100.26"
    : window.location.hostname;

console.log("URL do servidor:", SERVER_URL);

const PROFIT_THRESHOLDS = [
  { value: 0.3, label: "0.3%" },
  { value: 0.5, label: "0.5%" },
  { value: 0.8, label: "0.8%" },
  { value: 1.0, label: "1.0%" },
  { value: 1.5, label: "1.5%" },
];

// Componente de linha da tabela memorizado
const TableRow = memo(
  ({ data, previousData }) => {
    const hasChanged =
      previousData &&
      (data.spotPrice !== previousData.spotPrice ||
        data.futuresPrice !== previousData.futuresPrice);

    const getPriceChangeClass = (current, previous) => {
      if (!previous) return "";
      return current > previous
        ? "price-up"
        : current < previous
        ? "price-down"
        : "";
    };

    return (
      <tr className={hasChanged ? "value-changed" : ""}>
        <td>{data.symbol}</td>
        <td
          className={getPriceChangeClass(
            data.spotPrice,
            previousData?.spotPrice
          )}
        >
          ${data.spotPrice.toFixed(4)}
        </td>
        <td
          className={getPriceChangeClass(
            data.futuresPrice,
            previousData?.futuresPrice
          )}
        >
          ${data.futuresPrice.toFixed(4)}
        </td>
        <td>${data.priceDiff.toFixed(4)}</td>
        <td className={`profit ${data.profit >= 0.5 ? "price-up" : ""}`}>
          {data.profit.toFixed(2)}%
        </td>
        <td>{data.direction}</td>
        <td>{data.spotFee}%</td>
        <td>{data.futuresFee}%</td>
        <td>${formatNumber(data.spotLiquidity)}</td>
        <td>${formatNumber(data.futuresLiquidity)}</td>
      </tr>
    );
  },
  (prevProps, nextProps) => {
    // Otimização de re-renderização
    return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
  }
);

const MarketAnalysis = () => {
  const [spotData, setSpotData] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profitThreshold, setProfitThreshold] = useState(0.5);
  const [selectedSpotExchange, setSelectedSpotExchange] = useState("binance");
  const [selectedFutureExchange, setSelectedFutureExchange] =
    useState("binance");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "profit",
    direction: "desc",
  });
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const previousDataRef = useRef([]);
  const [changedItems, setChangedItems] = useState({});

  // Função para normalizar símbolos de forma mais robusta
  const normalizeSymbol = useCallback((symbol) => {
    if (!symbol) return "";

    // Remove caracteres especiais e converte para maiúsculas
    let normalized = symbol.toString().replace(/[-_]/g, "").toUpperCase();

    // Tratamento especial para pares com USDT
    if (normalized.endsWith("USDT")) {
      normalized = normalized.replace("USDT", "USDT");
    }

    // Tratamento especial para pares com USD
    if (normalized.endsWith("USD")) {
      normalized = normalized.replace("USD", "USDT");
    }

    // Tratamento especial para pares com BUSD
    if (normalized.endsWith("BUSD")) {
      normalized = normalized.replace("BUSD", "USDT");
    }

    // Tratamento especial para pares com USDC
    if (normalized.endsWith("USDC")) {
      normalized = normalized.replace("USDC", "USDT");
    }

    // Tratamento especial para pares com DAI
    if (normalized.endsWith("DAI")) {
      normalized = normalized.replace("DAI", "USDT");
    }

    // Tratamento especial para pares com TUSD
    if (normalized.endsWith("TUSD")) {
      normalized = normalized.replace("TUSD", "USDT");
    }

    // Tratamento especial para pares com FDUSD
    if (normalized.endsWith("FDUSD")) {
      normalized = normalized.replace("FDUSD", "USDT");
    }

    // Tratamento especial para pares com USDP
    if (normalized.endsWith("USDP")) {
      normalized = normalized.replace("USDP", "USDT");
    }

    // Tratamento especial para pares com USDD
    if (normalized.endsWith("USDD")) {
      normalized = normalized.replace("USDD", "USDT");
    }

    return normalized;
  }, []);

  const processMarketData = useCallback(
    (spotData, futuresData, spotFees, futuresFees) => {
      const opportunities = [];

      // Filtrar dados inválidos
      const validSpotData = spotData.filter(
        (item) => item && item.symbol && item.price
      );
      const validFuturesData = futuresData.filter(
        (item) => item && item.symbol && item.price
      );

      // Criar um mapa de símbolos disponíveis em cada exchange
      const spotSymbols = new Set(
        validSpotData.map((item) => normalizeSymbol(item.symbol))
      );
      const futuresSymbols = new Set(
        validFuturesData.map((item) => normalizeSymbol(item.symbol))
      );

      // Encontrar símbolos comuns entre spot e futures
      const commonSymbols = [...spotSymbols].filter((symbol) =>
        futuresSymbols.has(symbol)
      );

      console.log(
        `Símbolos disponíveis em ${selectedSpotExchange}: ${spotSymbols.size}`
      );
      console.log(
        `Símbolos disponíveis em ${selectedFutureExchange}: ${futuresSymbols.size}`
      );
      console.log(`Símbolos comuns: ${commonSymbols.length}`);

      // Log dos primeiros símbolos de cada conjunto para debug
      console.log("Primeiros 5 símbolos spot:", [...spotSymbols].slice(0, 5));
      console.log(
        "Primeiros 5 símbolos futures:",
        [...futuresSymbols].slice(0, 5)
      );
      console.log("Primeiros 5 símbolos comuns:", commonSymbols.slice(0, 5));

      // Agrupa os dados spot por símbolo normalizado
      const spotBySymbol = validSpotData.reduce((acc, item) => {
        const normalizedSymbol = normalizeSymbol(item.symbol);
        if (!acc[normalizedSymbol]) {
          acc[normalizedSymbol] = [];
        }
        acc[normalizedSymbol].push(item);
        return acc;
      }, {});

      // Para cada símbolo comum entre spot e futures
      commonSymbols.forEach((symbol) => {
        const spotItems = spotBySymbol[symbol] || [];
        const futuresItem = validFuturesData.find(
          (f) => normalizeSymbol(f.symbol) === symbol
        );

        if (spotItems.length > 0 && futuresItem) {
          // Usa o melhor preço spot disponível
          const bestSpotPrice = Math.min(
            ...spotItems.map((item) => parseFloat(item.price))
          );
          const futuresPrice = parseFloat(futuresItem.price);

          // Calcula a diferença de preço e o lucro
          const priceDiff = Math.abs(bestSpotPrice - futuresPrice);
          const profit =
            (Math.max(bestSpotPrice, futuresPrice) /
              Math.min(bestSpotPrice, futuresPrice) -
              1) *
            100;

          // Verifica se o lucro atende ao threshold
          if (profit >= profitThreshold) {
            // Calcula a liquidez total do spot
            const totalSpotLiquidity = spotItems.reduce(
              (sum, item) => sum + (parseFloat(item.volume) || 0),
              0
            );

            // Adiciona a oportunidade
            opportunities.push({
              symbol,
              spotPrice: bestSpotPrice,
              futuresPrice,
              priceDiff,
              profit,
              spotFee: spotFees?.tradingFee || 0.1,
              futuresFee: futuresFees?.tradingFee || 0.04,
              spotLiquidity: totalSpotLiquidity,
              futuresLiquidity: parseFloat(futuresItem.volume) || 0,
              direction:
                bestSpotPrice > futuresPrice
                  ? "Spot → Future"
                  : "Future → Spot",
              spotExchange: selectedSpotExchange,
              futuresExchange: selectedFutureExchange,
            });
          }
        }
      });

      // Ordenar por lucro (maior primeiro)
      return opportunities.sort((a, b) => b.profit - a.profit);
    },
    [
      profitThreshold,
      selectedSpotExchange,
      selectedFutureExchange,
      normalizeSymbol,
    ]
  );

  const updatePrices = useCallback((newData) => {
    setMarketData((prevData) => {
      const updatedData = prevData.map((item) => {
        const updatedSpot = newData.spot?.find((s) => s.symbol === item.symbol);
        const updatedFutures = newData.futures?.find(
          (f) => f.symbol === item.symbol
        );

        if (!updatedSpot && !updatedFutures) return item;

        const spotPrice = updatedSpot
          ? parseFloat(updatedSpot.price)
          : item.spotPrice;
        const futuresPrice = updatedFutures
          ? parseFloat(updatedFutures.price)
          : item.futuresPrice;
        const priceDiff = Math.abs(spotPrice - futuresPrice);
        const profit =
          (Math.max(spotPrice, futuresPrice) /
            Math.min(spotPrice, futuresPrice) -
            1) *
          100;

        return {
          ...item,
          spotPrice,
          futuresPrice,
          priceDiff,
          profit,
          spotLiquidity: updatedSpot?.volume || item.spotLiquidity,
          futuresLiquidity: updatedFutures?.volume || item.futuresLiquidity,
          direction:
            spotPrice > futuresPrice ? "Spot → Future" : "Future → Spot",
        };
      });

      return updatedData;
    });
  }, []);

  // Função para processar a mensagem do WebSocket
  const handleWebSocketMessage = useCallback(
    (event) => {
      try {
        const rawData = JSON.parse(event.data);

        // Filtra apenas os dados relevantes para a exchange selecionada
        const currentSpotData = rawData.filter(
          (item) =>
            item?.exchangeName?.toLowerCase() ===
            selectedSpotExchange.toLowerCase()
        );

        // Atualiza apenas os preços dos itens existentes
        setMarketData((prevData) => {
          return prevData.map((item) => {
            const updatedItem = currentSpotData.find(
              (spotItem) =>
                normalizeSymbol(spotItem?.symbol) ===
                normalizeSymbol(item.symbol)
            );
            if (updatedItem) {
              return {
                ...item,
                spotPrice: parseFloat(updatedItem.price),
                spotLiquidity:
                  parseFloat(updatedItem.volume) || item.spotLiquidity,
              };
            }
            return item;
          });
        });

        // Indicar que o carregamento inicial foi concluído
        setIsInitialLoad(false);
      } catch (error) {
        console.error("Erro ao processar mensagem do WebSocket:", error);
      }
    },
    [selectedSpotExchange, normalizeSymbol]
  );

  // Função para conectar ao WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      if (ws.current) {
        ws.current.close();
      }

      const wsUrl = `ws://${SERVER_URL}:5000/ws`;
      console.log("Tentando conectar ao WebSocket:", wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("✅ WebSocket conectado");
        setWsConnected(true);
      };

      ws.current.onmessage = (event) => {
        console.log("📨 Mensagem recebida:", event.data.slice(0, 100) + "...");
        handleWebSocketMessage(event);
      };

      ws.current.onclose = (event) => {
        console.log(
          "❌ WebSocket desconectado. Código:",
          event.code,
          "Razão:",
          event.reason
        );
        setWsConnected(false);
      };

      ws.current.onerror = (error) => {
        console.error("❌ Erro no WebSocket:", error);
        setWsConnected(false);
      };
    } catch (error) {
      console.error("❌ Erro ao conectar WebSocket:", error);
      setWsConnected(false);
    }
  }, [handleWebSocketMessage]);

  // Atualizar a função fetchData para ser mais robusta
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log(
        `Buscando dados para ${selectedSpotExchange} e ${selectedFutureExchange}`
      );

      // Buscar dados spot
      const spotResponse = await axios.get(
        `http://${SERVER_URL}:5000/api/${selectedSpotExchange}/spot/prices`
      );
      console.log(
        `Dados spot recebidos de ${selectedSpotExchange}:`,
        spotResponse.data.length,
        "itens"
      );

      // Buscar dados futures
      const futuresResponse = await axios.get(
        `http://${SERVER_URL}:5000/api/${selectedFutureExchange}/futures/prices`
      );
      console.log(
        `Dados futures recebidos de ${selectedFutureExchange}:`,
        futuresResponse.data.length,
        "itens"
      );

      // Buscar taxas com tratamento de erro
      let spotFees = { tradingFee: 0.1 }; // Valor padrão
      let futuresFees = { tradingFee: 0.04 }; // Valor padrão

      try {
        const spotFeesResponse = await axios.get(
          `http://${SERVER_URL}:5000/api/${selectedSpotExchange}/fees/spot`
        );
        spotFees = spotFeesResponse.data;
      } catch (error) {
        console.log(
          `Taxas spot não disponíveis para ${selectedSpotExchange}, usando valor padrão`
        );
      }

      try {
        const futuresFeesResponse = await axios.get(
          `http://${SERVER_URL}:5000/api/${selectedFutureExchange}/fees/futures`
        );
        futuresFees = futuresFeesResponse.data;
      } catch (error) {
        console.log(
          `Taxas futures não disponíveis para ${selectedFutureExchange}, usando valor padrão`
        );
      }

      // Processar e combinar os dados
      const processedData = processMarketData(
        spotResponse.data,
        futuresResponse.data,
        spotFees,
        futuresFees
      );

      console.log("Dados processados:", processedData.length, "oportunidades");

      // Atualizar os dados mantendo a referência anterior
      previousDataRef.current = marketData;
      setMarketData(processedData);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setLoading(false);
    }
  }, [selectedSpotExchange, selectedFutureExchange, processMarketData]);

  // Atualizar o useEffect para usar a nova função fetchData
  useEffect(() => {
    // Limpar dados anteriores ao mudar de exchange
    setMarketData([]);
    previousDataRef.current = [];

    // Buscar novos dados
    fetchData();

    // Reconectar WebSocket com a nova exchange
    connectWebSocket();

    const interval = setInterval(fetchData, 5000); // Atualizar a cada 5 segundos

    return () => clearInterval(interval);
  }, [fetchData, connectWebSocket]);

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const sortedData = [...marketData].sort((a, b) => {
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    return (a[sortConfig.key] - b[sortConfig.key]) * direction;
  });

  const filteredData = sortedData.filter((item) =>
    item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para detectar mudanças de preço e adicionar efeito visual
  const updateWithPriceChanges = useCallback((newData, oldData) => {
    const changes = {};

    newData.forEach((item) => {
      const oldItem = oldData.find((old) => old.symbol === item.symbol);
      if (oldItem && oldItem.spotPrice !== item.spotPrice) {
        changes[item.symbol] =
          item.spotPrice > oldItem.spotPrice ? "up" : "down";
      }
    });

    // Atualiza estado de mudanças
    setChangedItems(changes);

    // Limpa após a animação
    setTimeout(() => {
      setChangedItems({});
    }, 1000);

    return newData;
  }, []);

  const handleExchangeChange = (exchange, type) => {
    console.log(`Alterando exchange ${type} para:`, exchange);
    if (type === "spot") {
      setSelectedSpotExchange(exchange);
    } else {
      setSelectedFutureExchange(exchange);
    }
    // Não precisamos chamar fetchData aqui pois o useEffect já vai fazer isso
  };

  const handleProfitThresholdChange = (threshold) => {
    console.log("Alterando threshold de lucro para:", threshold);
    setProfitThreshold(threshold);
    // Recalcular os dados com o novo threshold
    fetchData();
  };

  return (
    <Layout>
      <CryptoBackground />
      <div className="market-analysis-container">
        <h2>Análise de Mercado</h2>
        <p>
          Compare preços entre diferentes exchanges e encontre oportunidades de
          arbitragem
        </p>

        <div className="controls-container">
          {/* Seleção de Exchanges */}
          <div className="exchange-box">
            <h3>Exchanges Spot</h3>
            <div className="exchange-filter">
              {["binance", "mexc", "bitget", "gateio", "kucoin"].map(
                (exchange) => (
                  <button
                    key={`spot-${exchange}`}
                    className={`exchange-button ${
                      selectedSpotExchange === exchange ? "active" : ""
                    }`}
                    onClick={() => handleExchangeChange(exchange, "spot")}
                  >
                    {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="exchange-box">
            <h3>Exchanges Futures</h3>
            <div className="exchange-filter">
              {["binance", "mexc", "bitget", "gateio", "kucoin"].map(
                (exchange) => (
                  <button
                    key={`futures-${exchange}`}
                    className={`exchange-button ${
                      selectedFutureExchange === exchange ? "active" : ""
                    }`}
                    onClick={() => handleExchangeChange(exchange, "futures")}
                  >
                    {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Filtro de Lucro */}
          <div className="exchange-box">
            <h3>Filtro de Lucro Mínimo</h3>
            <div className="exchange-filter">
              {PROFIT_THRESHOLDS.map(({ value, label }) => (
                <button
                  key={value}
                  className={`exchange-button ${
                    profitThreshold === value ? "active" : ""
                  }`}
                  onClick={() => handleProfitThresholdChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status de Conexão */}
          <div className="connection-status">
            <span
              className={`status-dot ${
                wsConnected ? "connected" : "disconnected"
              }`}
            ></span>
            <span>{wsConnected ? "Conectado" : "Desconectado"}</span>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="table-container">
          {loading ? (
            <div className="loading">Carregando dados...</div>
          ) : marketData.length === 0 ? (
            <div className="no-data">Nenhuma oportunidade encontrada</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Símbolo</th>
                  <th>Preço Spot</th>
                  <th>Preço Future</th>
                  <th>Diferença</th>
                  <th>Lucro</th>
                  <th>Direção</th>
                  <th>Taxa Spot</th>
                  <th>Taxa Future</th>
                  <th>Liquidez Spot</th>
                  <th>Liquidez Future</th>
                </tr>
              </thead>
              <tbody>
                {marketData.map((item, index) => (
                  <TableRow
                    key={item.symbol}
                    data={item}
                    previousData={previousDataRef.current[index]}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

// Função auxiliar para formatar números grandes
const formatNumber = (num) => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(2) + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + "K";
  }
  return num.toFixed(2);
};

export default MarketAnalysis;
