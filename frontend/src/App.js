import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/")
      .then(response => {
        console.log(response.data);
      })
      .catch(error => console.log(error));
  }, []);

  return (
    <div>
      <h1>Crypto Analyzer</h1>
      <p>Monitoramento de Criptomoedas</p>
    </div>
  );
}

export default App;
