let bancoActual = "bbva";

function selectBank(banco) {
  document.querySelectorAll('.bank-card').forEach(card => card.classList.remove('active'));
  document.getElementById(banco + 'Card').classList.add('active');
  bancoActual = banco;

  const titulo = document.getElementById("titulo");
  titulo.textContent = `💶 Predicciones del modelo ${banco.toUpperCase()}`;
  document.getElementById("resultado").textContent = "Esperando predicción...";
}

function selectInterval(btn) {
  document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

document.getElementById("predictBtn").addEventListener("click", predecir);

async function predecir() {
  const url = `https://martinagg-bank-stock-api.hf.space/predict/${bancoActual}`;
  const result = document.getElementById("resultado");
  result.textContent = "Cargando...";

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n_future: 3 })
    });

    const data = await resp.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    result.textContent = "⚠️ Error al conectar con la API\n" + error;
  }
}
