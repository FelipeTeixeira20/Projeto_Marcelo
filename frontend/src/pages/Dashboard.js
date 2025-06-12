import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";
import CryptoBackground from "../components/CryptoBackground"; // 🔥 Voltando com o fundo animado
import axios from "axios";
import { FaStar } from "react-icons/fa";
import "./Dashboard.css";
import CryptoModal from "../components/CryptoModal"; // Adicione este import

const SERVER_URL = process.env.REACT_APP_API_URL;

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
  const [selectedExchange, setSelectedExchange] = useState(() => {
    const binance = exchanges.find((ex) => ex.id === "binance");
    return binance || exchanges[0]; // Começa com Binance se existir, senão MEXC
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ws = useRef(null);
  const observer = useRef();

  // Referências para manter os valores mais recentes de selectedExchange e processNewData
  // nos callbacks do WebSocket sem adicionar aos deps do useEffect principal do WebSocket.
  const selectedExchangeRef = useRef(selectedExchange);
  const processNewDataRef = useRef(null); // Inicializar com null

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
        `${SERVER_URL}/api/${selectedExchange.id}/spot/prices`
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
      // E garantir unicidade dos dados processados usando o 'id' como chave
      const uniqueProcessedData = Array.from(
        new Map(processedData.map((item) => [item.id, item])).values()
      );

      if (processedData.length !== uniqueProcessedData.length) {
        console.warn(
          `[fetchInitialData] Foram removidos ${
            processedData.length - uniqueProcessedData.length
          } itens duplicados (baseado no id) da carga inicial para ${
            selectedExchange.name
          }.`
        );
      }

      setCryptos(uniqueProcessedData);
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
      const currentSelectedExchange = selectedExchangeRef.current;
      console.log(
        `[WebSocket processNewData] Iniciando para ${
          currentSelectedExchange.name
        }. Recebidos ${newData ? newData.length : 0} itens.`
      );
      if (!newData || !Array.isArray(newData)) {
        console.warn(
          "[WebSocket processNewData] Dados inválidos ou não é array."
        );
        return;
      }

      const filteredData = newData.filter(
        (item) =>
          item &&
          item.symbol &&
          item.price &&
          item.exchangeId &&
          item.exchangeId === currentSelectedExchange.id && // Apenas da corretora selecionada
          !isNaN(parseFloat(item.price)) &&
          parseFloat(item.price) > 0
      );

      if (filteredData.length === 0) {
        // console.log(
        //   `[WebSocket processNewData] Nenhum dado relevante para ${currentSelectedExchange.name} após filtro.`
        // );
        return;
      }
      // console.log(
      //   `[WebSocket processNewData] Para ${
      //     currentSelectedExchange.name
      //   }, ${filteredData.length} itens após filtro (exchangeId=${
      //     currentSelectedExchange.id
      //   }). Primeiros 5: ${JSON.stringify(filteredData.slice(0, 5))}`
      // );

      setCryptos((prevCryptos) => {
        // 1. Crie um Map dos prevCryptos para fácil acesso e para começar a construir o novo estado.
        const newCryptosMap = new Map(prevCryptos.map((c) => [c.id, c]));
        let itemsAddedOrUpdatedCount = 0;
        let priceChangesToApply = {}; // Coletar mudanças de preço

        // 2. Processe os dados filtrados do WebSocket.
        filteredData.forEach((item) => {
          const id = `${item.symbol}_${item.exchangeId}`;
          const existingCrypto = newCryptosMap.get(id);
          const newPriceFloat = parseFloat(item.price);

          if (existingCrypto) {
            const existingPriceFloat = parseFloat(existingCrypto.price);
            if (existingPriceFloat !== newPriceFloat) {
              newCryptosMap.set(id, {
                ...existingCrypto,
                price: newPriceFloat,
                prevPrice: existingPriceFloat,
                priceChange: newPriceFloat > existingPriceFloat ? "up" : "down",
              });
              itemsAddedOrUpdatedCount++;
              priceChangesToApply[id] =
                newPriceFloat > existingPriceFloat ? "up" : "down";
            }
          } else {
            // Novo item (deve ser raro se a carga inicial é completa para a corretora)
            newCryptosMap.set(id, {
              ...item, // spread do item do WebSocket
              id: id,
              exchangeId: currentSelectedExchange.id, // Garantir que é da corretora atual
              exchangeName: currentSelectedExchange.name,
              exchangeColor: currentSelectedExchange.color,
              price: newPriceFloat,
              prevPrice: newPriceFloat,
              priceChange: null,
              // Liquidez e outros campos que podem não estar no stream do WebSocket
              // serão herdados do 'item' se existirem, ou podem precisar ser buscados/mantidos
              // Se o objeto 'item' do WebSocket não tiver todos os campos de 'existingCrypto',
              // pode ser necessário um merge mais cuidadoso ou garantir que o backend envie todos os dados.
              // Por ora, assumimos que 'item' tem o suficiente ou que a ausência é OK.
              liquidity:
                item.liquidity !== undefined
                  ? item.liquidity
                  : existingCrypto
                  ? existingCrypto.liquidity
                  : undefined,
              volume:
                item.volume !== undefined
                  ? item.volume
                  : existingCrypto
                  ? existingCrypto.volume
                  : undefined,
              // Adicione outros campos aqui se necessário
            });
            itemsAddedOrUpdatedCount++;
            // Para novos itens, não há "mudança" de preço visual imediata,
            // mas você poderia definir um se quisesse destacá-los.
          }
        });

        if (
          itemsAddedOrUpdatedCount === 0 &&
          Object.keys(priceChangesToApply).length === 0
        ) {
          return prevCryptos; // Nenhum item foi realmente alterado ou adicionado
        }

        // Aplicar os priceChanges coletados de uma vez
        if (Object.keys(priceChangesToApply).length > 0) {
          setPriceChanges((prev) => {
            const updatedChanges = { ...prev, ...priceChangesToApply };
            // Limpar os highlights após 1 segundo
            Object.keys(priceChangesToApply).forEach((key) => {
              setTimeout(() => {
                setPriceChanges((current) => {
                  const next = { ...current };
                  delete next[key];
                  return next;
                });
              }, 1000);
            });
            return updatedChanges;
          });
        }

        const finalNewCryptos = Array.from(newCryptosMap.values());

        // O log de duplicatas removidas e o "Error Component Stack" associado
        // não devem mais ocorrer com esta lógica, pois o Map garante unicidade por ID.
        // Se ainda ocorrer, o problema é mais sutil ou está em outro lugar.
        // console.log(`[WebSocket processNewData] Estado cryptos atualizado para ${currentSelectedExchange.name}. Total: ${finalNewCryptos.length}`);

        return finalNewCryptos;
      });
    },
    [selectedExchangeRef, setPriceChanges] // setCryptos é estável, selectedExchangeRef é uma ref
  );

  // NOVO useEffect principal para gerenciar o ciclo de vida do WebSocket
  useEffect(() => {
    // Atualiza as refs com os valores mais recentes sempre que mudarem
    selectedExchangeRef.current = selectedExchange;
    processNewDataRef.current = processNewData;
  }, [selectedExchange, processNewData]);

  useEffect(() => {
    console.log(
      `[WebSocket Setup useEffect] Configurando WebSocket. Servidor: ${SERVER_URL}. Seleção inicial para filtro: ${selectedExchangeRef.current.name}`
    );

    // Função para fechar a conexão WebSocket existente de forma segura
    const closeExistingSocket = () => {
      if (ws.current) {
        console.log(
          `[WebSocket Setup useEffect] Tentando fechar conexão WebSocket existente. Estado: ${ws.current.readyState}`
        );
        if (
          ws.current.readyState === WebSocket.OPEN ||
          ws.current.readyState === WebSocket.CONNECTING
        ) {
          ws.current.close(1000, "Reconfiguring WebSocket");
          console.log("[WebSocket Setup useEffect] Comando close enviado.");
        } else {
          console.log(
            "[WebSocket Setup useEffect] Conexão existente não estava OPEN ou CONNECTING, não fechando ativamente."
          );
        }
        ws.current = null; // Definir como null após fechar ou se não estava aberta
      }
    };

    closeExistingSocket();

    // Introduzir um pequeno atraso para garantir que a porta foi liberada se uma conexão foi fechada
    // Isso é uma tentativa, pode não ser necessário ou precisar de ajuste.
    // setTimeout(() => {
    console.log(
      "[WebSocket Setup useEffect] Criando nova instância WebSocket..."
    );
    const wsHost = new URL(SERVER_URL).host;
    ws.current = new WebSocket(`wss://${wsHost}/ws`);
    setWsStatus("🟡 Conectando...");

    ws.current.onopen = () => {
      console.log(
        `[WebSocket onopen] Conectado. Exchange atualmente relevante para o frontend: ${selectedExchangeRef.current.name}`
      );
      setError("");
      setWsStatus("🟢 Conectado");
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // console.log(
        //   `[WebSocket onmessage] Dados recebidos. Exchange para filtro no frontend: ${selectedExchangeRef.current.name}`
        // );
        // Chama a versão mais recente de processNewData usando a ref
        processNewDataRef.current(data);
      } catch (e) {
        console.error("[WebSocket onmessage] Erro ao processar mensagem:", e);
      }
    };

    ws.current.onerror = (errorEvent) => {
      console.error(
        `[WebSocket onerror] Erro na conexão. Exchange relevante no frontend: ${selectedExchangeRef.current.name}`,
        errorEvent
      );
      setError("Erro na conexão WebSocket.");
      setWsStatus("🔴 Erro na conexão");
    };

    ws.current.onclose = (event) => {
      console.log(
        `[WebSocket onclose] Desconectado. Exchange relevante no frontend: ${selectedExchangeRef.current.name}. Code: ${event.code}, Reason: ${event.reason}, WasClean: ${event.wasClean}`
      );
      setWsStatus("⭕ Desconectado");
      // Evitar reconexão automática imediata se o fechamento foi intencional (código 1000 ou 1005)
      // ou se o componente está sendo desmontado (o cleanup fará isso).
      // Se desejar reconexão automática, adicione uma lógica mais robusta aqui, talvez com backoff.
      // Por exemplo: if (event.code !== 1000 && event.code !== 1005 && !event.wasClean) { ... }
    };

    // Função de limpeza para fechar o WebSocket quando o componente for desmontado ou SERVER_URL mudar
    return () => {
      console.log("[WebSocket Setup useEffect cleanup] Limpando WebSocket.");
      if (ws.current) {
        if (ws.current.readyState === WebSocket.OPEN) {
          ws.current.close(1000, "Component unmounting or SERVER_URL changed");
          console.log(
            "[WebSocket Setup useEffect cleanup] Comando close enviado para WebSocket aberto."
          );
        } else {
          console.log(
            `[WebSocket Setup useEffect cleanup] WebSocket não estava OPEN (estado: ${ws.current.readyState}). Apenas definindo ws.current como null.`
          );
        }
        ws.current = null;
      }
    };
  }, [SERVER_URL]); // Dependência principal: recria o WebSocket se SERVER_URL mudar.

  // useEffect para carregar dados iniciais QUANDO selectedExchange MUDA ou NO MOUNT INICIAL
  useEffect(() => {
    console.log(
      `Carregando dados iniciais para ${selectedExchange.name} (Disparado por selectedExchange ou mount)`
    );
    fetchInitialData();
  }, [selectedExchange]);

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
          `${SERVER_URL}/api/${exchangeId}/spot/prices`,
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
  const filteredCryptos = cryptos.filter((crypto) => {
    // Log para cada crypto sendo filtrada
    // console.log(`[Filtering] Crypto: ${crypto.symbol}, CryptoExchange: ${crypto.exchangeId}, SelectedExchange: ${selectedExchange.id}, Match: ${crypto.exchangeId === selectedExchange.id}`);
    return (
      !crypto.error &&
      crypto &&
      typeof crypto === "object" &&
      crypto.exchangeId === selectedExchange.id &&
      crypto.symbol &&
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Log para debug
  useEffect(() => {
    console.log(
      `[useEffect cryptos-debug] Total de cryptos carregadas no estado 'cryptos': ${cryptos.length}`
    );
    console.log(
      `[useEffect cryptos-debug] SelectedExchange ID no momento do log: ${selectedExchange.id}`
    );
    console.log(
      `[useEffect cryptos-debug] Total de cryptos filtradas (filteredCryptos): ${filteredCryptos.length}`
    );

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
        `${SERVER_URL}/api/${
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
    const newSelectedExchange = exchanges.find((ex) => ex.id === exchangeId);

    if (newSelectedExchange) {
      console.log(
        `[handleExchangeChange] Trocando de ${selectedExchange.name} para ${newSelectedExchange.name}. Limpando dados...`
      );
      // Limpar dados completamente antes de mudar
      setCryptos([]);
      setPriceChanges({});
      setVisibleCryptos(ITEMS_PER_PAGE);
      setError(""); // Limpar erros anteriores
      setLoading(true); // Indicar carregamento para a nova exchange

      // Atualizar a exchange selecionada (isso disparará o fetchInitialData via useEffect)
      setSelectedExchange(newSelectedExchange);
    } else {
      console.error(
        `[handleExchangeChange] Exchange com id ${exchangeId} não encontrada.`
      );
    }
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
                    className={`crypto-card ${priceChanges[crypto.id] || ""} ${
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
