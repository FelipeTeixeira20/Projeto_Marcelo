import React from "react";

// Crie um novo componente para as linhas da tabela
const MarketRow = React.memo(({ item }) => {
  return (
    <tr>
      <td>{item.symbol}</td>
      <td className="number-value">{item.spotPrice.toFixed(8)}</td>
      <td className="number-value">{item.futuresPrice.toFixed(8)}</td>
      <td className="number-value">{item.priceDiff.toFixed(8)}</td>
      <td className="number-value">{item.profit.toFixed(2)}%</td>
      <td>{item.direction}</td>
      <td className="number-value">{item.spotFee}%</td>
      <td className="number-value">{item.futuresFee}%</td>
      <td className="number-value">{item.spotLiquidity.toFixed(2)}</td>
      <td className="number-value">{item.futuresLiquidity.toFixed(2)}</td>
    </tr>
  );
});

export default MarketRow;
