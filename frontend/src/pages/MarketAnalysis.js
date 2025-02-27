import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import axios from "axios";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
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

                {loading ? (
                    <p>Carregando dados...</p>
                ) : (
                    <>
                        <div className="crypto-list">
                            {prices.slice(0, 12).map((crypto, index) => (
                                <div key={index} className="crypto-card">
                                    <h3>{crypto.symbol}</h3>
                                    <p>${parseFloat(crypto.price).toFixed(4)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="chart-container">
                            <Line
                                data={{
                                    labels: prices.slice(0, 10).map(crypto => crypto.symbol),
                                    datasets: [
                                        {
                                            label: "Preço em USDT",
                                            data: prices.slice(0, 10).map(crypto => parseFloat(crypto.price)),
                                            borderColor: "#6b01c9",
                                            backgroundColor: "rgba(107, 1, 201, 0.5)",
                                            tension: 0.3,
                                        },
                                    ],
                                }}
                            />
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default MarketAnalysis;