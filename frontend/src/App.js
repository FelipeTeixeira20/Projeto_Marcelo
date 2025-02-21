import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000"); // Conectar ao backend

function App() {
    const [prices, setPrices] = useState({});

    useEffect(() => {
        // Escutar os dados do WebSocket (atualização em tempo real)
        socket.on("cryptoPrices", (data) => {
            console.log("📊 Dados recebidos do WebSocket:", data.slice(0, 5)); // Exibir as 5 primeiras moedas no console

            setPrices((prevPrices) => {
                const updatedPrices = { ...prevPrices };

                data.forEach((crypto) => {
                    updatedPrices[crypto.symbol] = {
                        price: crypto.price, // Atualiza corretamente o preço
                        volume: crypto.volume, // Atualiza corretamente o volume
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
