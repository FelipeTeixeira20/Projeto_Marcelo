import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";

const socket = io("http://localhost:5000");

function App() {
    const [prices, setPrices] = useState({});

    useEffect(() => {
        socket.on("cryptoPrices", (data) => {
            console.log("📊 Dados recebidos do WebSocket:", data.slice(0, 5));

            setPrices((prevPrices) => {
                const updatedPrices = { ...prevPrices };

                data.forEach((crypto) => {
                    updatedPrices[crypto.symbol] = {
                        price: !isNaN(crypto.price) ? parseFloat(crypto.price) : 0, 
                        volume: !isNaN(crypto.volume) ? parseFloat(crypto.volume) : 0,
                    };
                });

                return updatedPrices;
            });
        });

        return () => {
            socket.off("cryptoPrices");
        };
    }, []);

    return (
        <div>
            <h1>Preços de Criptomoedas em Tempo Real</h1>
            <table border="1">
                <thead>
                    <tr>
                        <th>Moeda</th>
                        <th>Preço (USDT)</th>
                        <th>Volume</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(prices).length > 0 ? (
                        Object.entries(prices).map(([symbol, data], index) => (
                            <tr key={index}>
                                <td>{symbol}</td>
                                <td>${data.price.toFixed(4)}</td>
                                <td>{data.volume.toFixed(2)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="3">Carregando dados...</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default App;
