import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import CryptoBackground from "../components/CryptoBackground";
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
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedExchanges, setSelectedExchanges] = useState(exchanges.map(e => e.name));
    const [comparisonData, setComparisonData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("");

    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                if (!token) {
                    console.error("Erro: Token não encontrado.");
                    return;
                }

                const responses = await Promise.all(
                    exchanges.flatMap(exchange =>
                        ["spot", "futures"].map(marketType =>
                            axios
                                .get(`http://localhost:5000/api/${exchange.name.toLowerCase()}/${marketType}/prices`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                })
                                .catch(() => ({ data: [] }))
                        )
                    )
                );

                const formattedPrices = {};
                exchanges.forEach((exchange, index) => {
                    formattedPrices[exchange.name] = {
                        spot: responses[index * 2].data,
                        futures: responses[index * 2 + 1].data,
                    };
                });

                setPrices(formattedPrices);
                setLoading(false);
            } catch (error) {
                console.error("❌ Erro ao buscar preços:", error);
            }
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 5000);
        return () => clearInterval(interval);
    }, []);

    const toggleExchange = (exchange) => {
        setSelectedExchanges(prev =>
            prev.includes(exchange) ? prev.filter(e => e !== exchange) : [...prev, exchange]
        );
    };

    useEffect(() => {
        if (selectedExchanges.length === 0 || Object.keys(prices).length === 0) return;

        const newComparisons = [];
        const symbols = new Set();

        Object.values(prices).forEach(market => {
            [...market.spot, ...market.futures].forEach(crypto => symbols.add(crypto.symbol));
        });

        symbols.forEach(symbol => {
            selectedExchanges.forEach(exchange1 => {
                selectedExchanges.forEach(exchange2 => {
                    if (exchange1 !== exchange2) {
                        let priceSpot1 = parseFloat(prices[exchange1]?.spot?.find(c => c.symbol === symbol)?.price);
                        let priceFutures2 = parseFloat(prices[exchange2]?.futures?.find(c => c.symbol === symbol)?.price);
                        let priceFutures1 = parseFloat(prices[exchange1]?.futures?.find(c => c.symbol === symbol)?.price);
                        let priceSpot2 = parseFloat(prices[exchange2]?.spot?.find(c => c.symbol === symbol)?.price);

                        let feeSpot1 = parseFloat(prices[exchange1]?.spot?.find(c => c.symbol === symbol)?.fee) || 0;
                        let feeFutures2 = parseFloat(prices[exchange2]?.futures?.find(c => c.symbol === symbol)?.fee) || 0;
                        let feeFutures1 = parseFloat(prices[exchange1]?.futures?.find(c => c.symbol === symbol)?.fee) || 0;
                        let feeSpot2 = parseFloat(prices[exchange2]?.spot?.find(c => c.symbol === symbol)?.fee) || 0;

                        const addComparison = (exchangeA, exchangeB, priceA, priceB, feeA, feeB) => {
                            if (!isNaN(priceA) && !isNaN(priceB) && priceA > 0 && priceB > 0) {
                                const maxPrice = Math.max(priceA, priceB);
                                const minPrice = Math.min(priceA, priceB);
                                const spread = Math.abs(priceA - priceB);
                                const profitPercent = ((maxPrice / minPrice) - 1) * 100;

                                if (profitPercent > 0) {
                                    newComparisons.push({
                                        symbol,
                                        exchangeA,
                                        exchangeB,
                                        priceA,
                                        priceB,
                                        profitPercent: profitPercent.toFixed(2),
                                        spread: spread.toFixed(8),
                                        feeA: feeA.toFixed(4),
                                        feeB: feeB.toFixed(4)
                                    });
                                }
                            }
                        };

                        addComparison(exchange1 + " Spot", exchange2 + " Futures", priceSpot1, priceFutures2, feeSpot1, feeFutures2);
                        addComparison(exchange1 + " Futures", exchange2 + " Spot", priceFutures1, priceSpot2, feeFutures1, feeSpot2);
                        addComparison(exchange1 + " Spot", exchange1 + " Futures", priceSpot1, priceFutures1, feeSpot1, feeFutures1);
                    }
                });
            });
        });

        setComparisonData(newComparisons);
    }, [selectedExchanges, prices]);

    const filteredComparisons = comparisonData.filter(comp =>
        comp.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedComparisons = [...filteredComparisons].sort((a, b) => {
        if (sortOption === "profit-desc") return b.profitPercent - a.profitPercent;
        if (sortOption === "profit-asc") return a.profitPercent - b.profitPercent;
        if (sortOption === "spread-desc") return b.spread - a.spread;
        if (sortOption === "spread-asc") return a.spread - b.spread;
        return 0;
    });

    return (
        <Layout>
            <CryptoBackground />

            <div className="market-analysis-container">
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

                <div className="search-filter-container">
                    <input type="text" placeholder="🔍 Buscar moeda..." className="search-input"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <select className="search-input" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                        <option value="" disabled hidden>Ordenar por</option>
                        <option value="profit-desc">Lucro: Maior → Menor</option>
                        <option value="profit-asc">Lucro: Menor → Maior</option>
                        <option value="spread-desc">Spread: Maior → Menor</option>
                        <option value="spread-asc">Spread: Menor → Maior</option>
                    </select>
                </div>

                <div className="comparisons-container">
                    {sortedComparisons.map((comp, index) => (
                        <div key={index} className="comparison-card">
                            <h3>{comp.symbol}</h3>
                            <p>{comp.exchangeA}: ${comp.priceA}</p>
                            <p>{comp.exchangeB}: ${comp.priceB}</p>
                            <p>Lucro: {comp.profitPercent}%</p>
                            <p>Spread: ${comp.spread}</p>
                            <p>Taxa A: {comp.feeA}% | Taxa B: {comp.feeB}%</p>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default MarketAnalysis;
