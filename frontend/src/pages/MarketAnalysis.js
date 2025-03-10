import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import axios from "axios";
import "./MarketAnalysis.css";

const exchanges = [
    { name: "Binance", color: "#F3BA2F" },
    { name: "Bitget", color: "#00FF7F" },
    { name: "Gate.io", color: "#00AA00" },
    { name: "KuCoin", color: "#0052FF" },
    { name: "MEXC", color: "#FF0000" },
];

const MarketAnalysis = () => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExchanges, setSelectedExchanges] = useState(exchanges.map(e => e.name));
    const [comparisonData, setComparisonData] = useState([]);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get("https://api.mexc.com/api/v3/ticker/price");
                setPrices(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Erro ao buscar dados: ", error);
            }
        };
        fetchData();
    }, []);

    const toggleExchange = (exchange) => {
        setSelectedExchanges(prev =>
            prev.includes(exchange) ? prev.filter(e => e !== exchange) : [...prev, exchange]
        );
    };

    useEffect(() => {
        if (selectedExchanges.length < 2 || prices.length === 0) return;

        const generateComparisons = () => {
            const newComparisons = [];
            for (let i = 0; i < selectedExchanges.length; i++) {
                for (let j = i + 1; j < selectedExchanges.length; j++) {
                    const exchange1 = selectedExchanges[i];
                    const exchange2 = selectedExchanges[j];

                    prices.forEach(crypto => {
                        if (crypto.symbol.includes("USDT")) {
                            const price1 = parseFloat((Math.random() * 100 + 10).toFixed(4));
                            const price2 = parseFloat((Math.random() * 100 + 10).toFixed(4));

                            if (price1 && price2) {
                                const profitPercent = ((price2 - price1) / price1) * 100;
                                const fundingRate = (Math.random() * 0.05).toFixed(4);

                                newComparisons.push({
                                    symbol: crypto.symbol,
                                    exchange1,
                                    exchange2,
                                    price1: price1.toFixed(4),
                                    price2: price2.toFixed(4),
                                    profitPercent: profitPercent.toFixed(2),
                                    fundingRate: fundingRate
                                });
                            }
                        }
                    });
                }
            }
            setComparisonData(newComparisons);
        };

        generateComparisons();
    }, [selectedExchanges, prices]);

    const filteredComparisons = comparisonData.filter(comp => {
        if (filter === "positive") return comp.fundingRate > 0;
        if (filter === "negative") return comp.fundingRate < 0;
        if (filter === "profit") return comp.profitPercent > 0;
        return true;
    });

    return (
        <Layout>
            <div className="market-analysis-container">
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
                
                <h2>Análise de Mercado</h2>
                <p>Compare os preços das criptomoedas entre diferentes corretoras.</p>

                <div className="exchange-box">
                    <h3>Selecione suas exchanges favoritas</h3>
                    <div className="exchange-filter">
                        {exchanges.map((exchange, index) => (
                            <button
                                key={index}
                                className={`exchange-button ${selectedExchanges.includes(exchange.name) ? "active" : ""}`}
                                onClick={() => toggleExchange(exchange.name)}
                                style={{
                                    borderColor: selectedExchanges.includes(exchange.name) ? exchange.color : "transparent",
                                    color: selectedExchanges.includes(exchange.name) ? "#fff" : "#aaa",
                                }}
                            >
                                {exchange.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="filter-box">
                    <h3>Filtrar Comparações</h3>
                    <div className="filter-buttons">
                        <button className={`filter-button ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Todas</button>
                        <button className={`filter-button ${filter === "profit" ? "active" : ""}`} onClick={() => setFilter("profit")}>Maior Lucro</button>
                        <button className={`filter-button ${filter === "positive" ? "active" : ""}`} onClick={() => setFilter("positive")}>Taxa +</button>
                        <button className={`filter-button ${filter === "negative" ? "active" : ""}`} onClick={() => setFilter("negative")}>Taxa -</button>
                    </div>
                </div>

                {loading ? (
                    <p>Carregando dados...</p>
                ) : (
                    <div className="comparisons-container">
                        {filteredComparisons.length > 0 ? (
                            filteredComparisons.map((comp, index) => (
                                <div key={index} className="comparison-card">
                                    <h3>{comp.symbol}</h3>
                                    <p><b>{comp.exchange1}</b>: ${comp.price1}</p>
                                    <p><b>{comp.exchange2}</b>: ${comp.price2}</p>
                                    <p className={`profit ${comp.profitPercent >= 0 ? "positive" : "negative"}`}>
                                        Lucro: {comp.profitPercent}%
                                    </p>
                                    <p className={`funding-rate ${comp.fundingRate >= 0 ? "positive" : "negative"}`}>
                                        Taxa: {comp.fundingRate}%
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p>Nenhuma comparação disponível. Selecione pelo menos 2 exchanges.</p>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MarketAnalysis;
