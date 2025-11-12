// ==========================
// 🔧 Configuración global
// ==========================
const estilosBanco = {
  bbva: {
    color: "#00e0ff",
    nombre: "BBVA",
    modelo: "LSTM",
    link: "https://finance.yahoo.com/quote/BBVA.MC/history/"
  },
  santander: {
    color: "#ef233c",
    nombre: "Santander",
    modelo: "GRU",
    link: "https://finance.yahoo.com/quote/SAN.MC/history/"
  }
};

let bancoActual = "bbva";
let diasSeleccionados = 7;
let datos = null;

// ==========================
// 🔹 Carga inicial
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ script.js cargado correctamente");
  cargarCSV(bancoActual);
  cargarNoticias();
  cargarCurvaTest(bancoActual);
});

// ==========================
// 📈 Cargar CSV y gráficos
// ==========================
function cargarCSV(banco) {
  const csvPath = `data/${banco}.csv`;
  console.log(`Intentando cargar: ${csvPath} ...`);

  Papa.parse(csvPath, {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function (results) {
      if (!results || !results.data || results.data.length === 0) {
        console.error(`⚠️ Error: el archivo ${csvPath} está vacío`);
        return;
      }
      datos = results.data
        .filter(row => row.Date && row.Close != null)
        .sort((a, b) => new Date(a.Date) - new Date(b.Date));
      actualizarGrafico();
    },
    error: function (err) {
      console.error(`⚠️ Error al cargar el CSV: ${csvPath}`);
      console.error(err);
    },
  });
}

// ==========================
// 🏦 Cambio de banco
// ==========================
function selectBank(banco) {
  document.querySelectorAll('.bank-card').forEach(card => card.classList.remove('active'));
  document.getElementById(banco + 'Card').classList.add('active');
  bancoActual = banco;
  cargarCSV(bancoActual);
  actualizarBancoPred();
}

// ==========================
// 🗓️ Intervalo temporal
// ==========================
function selectInterval(btn, dias) {
  document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  diasSeleccionados = dias;
  actualizarGrafico();
}

// ==========================
// 📊 Gráfico principal (unión real–predicción sin duplicar punto)
// ==========================
async function actualizarGrafico() {
  if (!datos || datos.length === 0) return;
  const estilo = estilosBanco[bancoActual];
  const n = Math.min(diasSeleccionados, datos.length);
  const slice = datos.slice(-n);
  const fechas = slice.map(d => d.Date);
  const cierres = slice.map(d => d.Close);
  if (cierres.length === 0) return;

  // === TRACE REAL ===
  const traceReal = {
    x: fechas,
    y: cierres,
    type: "scatter",
    mode: "lines+markers",
    name: "Histórico real",
    line: { color: estilo.color, width: 2 },
    marker: { color: estilo.color, size: 4 },
    customdata: slice.map(d => [d.Open, d.High, d.Low, d.Close]),
    hovertemplate:
      "<b>Open:</b> %{customdata[0]:.2f} €<br>" +
      "<b>High:</b> %{customdata[1]:.2f} €<br>" +
      "<b>Low:</b> %{customdata[2]:.2f} €<br>" +
      "<b>Close:</b> %{customdata[3]:.2f} €<extra></extra>"
  };

  // === TRACE PREDICCIÓN ===
  let tracePred = null;
  if (diasSeleccionados <= 7) {
    try {
      const resp = await fetch(`https://martinagg-bank-stock-api.hf.space/predict/${bancoActual}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n_future: 3 })
      });
      const data = await resp.json();
      const preds = data.predicciones.slice(0, 3).map(v => parseFloat(v.toFixed(2)));

      // Fechas futuras consecutivas
      const ultimaFecha = new Date(fechas[fechas.length - 1]);
      const futuras = preds.map((_, i) => {
        const f = new Date(ultimaFecha);
        f.setDate(f.getDate() + (i + 1));
        return f.toISOString().split("T")[0];
      });

      // 🔹 La línea morada parte del último punto azul, sin duplicarlo visualmente
      const fechasPred = [fechas[fechas.length - 1], ...futuras];
      const valoresPred = [cierres[cierres.length - 1], ...preds];

      tracePred = {
        x: fechasPred,
        y: valoresPred,
        type: "scatter",
        mode: "lines+markers",
        name: "Predicción IA (3 días)",
        line: { color: "#bb86fc", width: 2, dash: "dot" },
        marker: {
          color: ["transparent", "#bb86fc", "#bb86fc", "#bb86fc"], // el primero invisible
          size: [0, 6, 6, 6],
          symbol: "diamond"
        },
        hovertemplate:
          "<b>Predicción:</b> %{y:.2f} €<br><b>Fecha:</b> %{x}<extra></extra>"
      };
    } catch (err) {
      console.warn("⚠️ No se pudieron obtener predicciones:", err);
    }
  }

  const layout = {
    paper_bgcolor: "#0b132b",
    plot_bgcolor: "#0b132b",
    margin: { t: 30, l: 60, r: 40, b: 50 },
    xaxis: {
      color: "#c3cfe2",
      showgrid: true,
      gridcolor: "rgba(255,255,255,0.07)",
      tickformat: "%b %d"
    },
    yaxis: {
      color: "#c3cfe2",
      showgrid: true,
      gridcolor: "rgba(255,255,255,0.07)",
      tickprefix: "€"
    },
    font: { color: "#c3cfe2" },
    legend: { orientation: "h", y: -0.25 }
  };

  const traces = [traceReal];
  if (tracePred) traces.push(tracePred);

  Plotly.newPlot("grafico", traces, layout, { responsive: true, displayModeBar: false });

  const precioActual = cierres[cierres.length - 1];
  const precioActualEl = document.getElementById("precioActual");
  if (precioActualEl) {
    precioActualEl.textContent = `€${precioActual.toFixed(2)}`;
    precioActualEl.style.color = estilo.color;
  }

  document.querySelector(".chart-title h3").style.color = estilo.color;
  document.getElementById("chartIcon").style.color = estilo.color;
  actualizarMetricas(cierres);
}

// ==========================
// 📊 Métricas estadísticas
// ==========================
function actualizarMetricas(cierres) {
  if (!cierres || cierres.length === 0) return;
  const media = cierres.reduce((a, b) => a + b, 0) / cierres.length;
  const max = Math.max(...cierres);
  const min = Math.min(...cierres);
  let retornos = [];
  for (let i = 1; i < cierres.length; i++) retornos.push(Math.log(cierres[i] / cierres[i - 1]));
  const tendenciaMedia = (retornos.reduce((a, b) => a + b, 0) / retornos.length) * 100;
  const varianza = cierres.map(p => (p - media) ** 2).reduce((a, b) => a + b, 0) / cierres.length;
  const volatilidad = (Math.sqrt(varianza) / media) * 100;
  document.getElementById("var").textContent = `${tendenciaMedia.toFixed(3)}%`;
  document.getElementById("mean").textContent = `€${media.toFixed(2)}`;
  document.getElementById("max").textContent = `€${max.toFixed(2)}`;
  document.getElementById("min").textContent = `€${min.toFixed(2)}`;
  document.getElementById("vol").textContent = `${volatilidad.toFixed(2)}%`;
}

// ==========================
// 🤖 Predicciones IA
// ==========================
const API_URL = "https://martinagg-bank-stock-api.hf.space/predict";
const reales = {
  bbva: [17.30, 17.54, 17.64],
  santander: [8.85, 8.81, 8.88]
};

function actualizarBancoPred() {
  const bancoEl = document.getElementById("bancoPred");
  if (bancoEl) {
    const estilo = estilosBanco[bancoActual];
    bancoEl.textContent = `${estilo.modelo} • ${estilo.nombre}`;
  }
}

document.querySelectorAll(".ai-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".ai-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const dias = parseInt(btn.dataset.dias);
    await obtenerPredicciones(dias);
  });
});

async function obtenerPredicciones(dias) {
  const box = document.getElementById("ai-results");
  box.innerHTML = "<p> Calculando predicciones...</p>";

  try {
    const resp = await fetch(`${API_URL}/${bancoActual}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n_future: 3 })
    });
    const data = await resp.json();

    const pred = data.predicciones.slice(0, 3).map(v => parseFloat(v.toFixed(2)));
    const real = reales[bancoActual].slice(0, 3);
    const mae = calcularMAE(pred, real);
    const predMostradas = pred.slice(0, dias);

    let html = `<h3>Predicciones del modelo ${estilosBanco[bancoActual].modelo}</h3>`;
    predMostradas.forEach((v, i) => {
      html += `<div class="pred-item"><span>Día ${i + 1}</span><strong>€${v.toFixed(2)}</strong></div>`;
    });

    html += `
    <div class="mae-card">
        <div class="mae-header">
        <span class="material-symbols-rounded mae-icon">error_outline</span>
        <h4>Error Absoluto Medio - Predicción a ${dias} día${dias > 1 ? "s" : ""}</h4>
        </div>
        <div class="mae-content">
        <div class="mae-left">
            <p class="mae-title">MAE del modelo ${estilosBanco[bancoActual].modelo}</p>
            <p class="mae-sub">Media del error en predicciones</p>
        </div>
        <div class="mae-right">
            <h3>€${mae.toFixed(4)}</h3>
        </div>
        </div>
        <div class="mae-link-container">
        <a href="${estilosBanco[bancoActual].link}" target="_blank" class="mae-link">
            <span class="material-symbols-rounded link-icon">link</span>
            Ver valores reales en Yahoo Finance
        </a>
        </div>
    </div>
    `;
    box.innerHTML = html;
  } catch (err) {
    box.innerHTML = `<p style="color:#ff8080">⚠️ Error al conectar con la API</p>`;
  }
}

function calcularMAE(pred, real) {
  const n = Math.min(pred.length, real.length);
  let suma = 0;
  for (let i = 0; i < n; i++) suma += Math.abs(pred[i] - real[i]);
  return suma / n;
}

// ==========================
// 🔺 Simulador de escenarios
// ==========================
const API_SIM = "https://martinagg-bank-stock-api.hf.space/simulate";

document.getElementById("factorSlider").addEventListener("input", async (e) => {
  const factor = parseFloat(e.target.value);
  const porcentaje = ((factor - 1) * 100).toFixed(0);
  const color = factor > 1 ? "#00e676" : factor < 1 ? "#ff5252" : "#c3cfe2";
  document.getElementById("valorPorcentaje").textContent = `${porcentaje > 0 ? "+" : ""}${porcentaje}%`;
  document.getElementById("valorPorcentaje").style.color = color;

  const banco = bancoActual;
  await obtenerSimulacion(banco, factor);
});

async function obtenerSimulacion(banco, factor) {
  const resDivs = [
    document.getElementById("simDay1"),
    document.getElementById("simDay2"),
    document.getElementById("simDay3")
  ];
  resDivs.forEach(d => d.textContent = "");

  try {
    const resp = await fetch(`${API_SIM}/${banco}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factor_open: factor, n_future: 3 })
    });
    const data = await resp.json();
    const pred = data.predicciones;

    pred.forEach((v, i) => resDivs[i].textContent = `€${v.toFixed(2)}`);

    const baseOpen = 11.54;
    const nuevoOpen = baseOpen * factor;
    const delta = nuevoOpen - baseOpen;

    document.getElementById("valorOpen").textContent = `€${nuevoOpen.toFixed(2)}`;
    const deltaEl = document.getElementById("deltaOpen");
    deltaEl.textContent = `${delta >= 0 ? "+" : ""}€${delta.toFixed(2)}`;
    deltaEl.className = delta >= 0 ? "positivo" : "negativo";
  } catch (err) {
    resDivs.forEach(d => d.textContent = "⚠️ Error");
  }
}

// ==========================
// 📰 Noticias Financieras
// ==========================
const noticias = {
  bbva: [
    {
      titulo: "BBVA alcanza el 23,2% de su programa de recompra de acciones",
      descripcion:
        "La entidad acelera su plan de recompra dentro de su estrategia de creación de valor para el accionista.",
      fuente: "Yahoo Finanzas",
      link: "https://es.finance.yahoo.com/noticias/bbva-alcanza-23-2-programa-124000511.html",
      tiempo: "Hace 2 horas"
    },
    {
      titulo: "Últimas horas para poder cobrar el histórico dividendo de 1.842 millones",
      descripcion:
        "BBVA afronta el cierre del mayor pago en dividendos de su historia, consolidando su posición en el Ibex 35.",
      fuente: "Yahoo Finanzas",
      link: "https://es.finance.yahoo.com/noticias/bbva-lanza-emisi%C3%B3n-bono-coco-092000418.html",
      tiempo: "Hace 4 horas"
    },
    {
      titulo: "BBVA: potencial de más del 15% y recompras de acciones por 5.000 millones",
      descripcion:
        "Los analistas destacan el potencial alcista de la acción tras las recientes recompras autorizadas.",
      fuente: "Yahoo Finanzas",
      link: "https://es.finance.yahoo.com/noticias/bbva-potencial-15-recompras-acciones-101000927.html",
      tiempo: "Hace 1 día"
    }
  ],
  santander: [
    {
      titulo: "Banco Santander: nuevos máximos en Bolsa y la venta de la filial en Polonia enfilada",
      descripcion:
        "El banco alcanza máximos anuales tras la operación de desinversión en Europa Central.",
      fuente: "Yahoo Finanzas",
      link: "https://es.finance.yahoo.com/noticias/banco-santander-m%C3%A1ximos-bolsa-venta-084000781.html",
      tiempo: "Hace 3 horas"
    },
    {
      titulo: "Santander y BBVA mantienen impulso y podrían seguir subiendo en noviembre",
      descripcion:
        "Ambas entidades continúan mostrando fortaleza en sus cotizaciones tras un trimestre sólido.",
      fuente: "Yahoo Finanzas",
      link: "https://es.finance.yahoo.com/noticias/santander-bbva-seguir-subiendo-noviembre-121000271.html",
      tiempo: "Hace 6 horas"
    },
    {
      titulo: "Santander alcanza la cifra mágica tras superar nuevos máximos históricos",
      descripcion:
        "El banco roza niveles récord en capitalización, consolidando su liderazgo en el sector financiero.",
      fuente: "Yahoo Finanzas",
      link: "https://es.finance.yahoo.com/noticias/santander-m%C3%A1ximos-alcanza-m%C3%A1gica-cifra-093000403.html",
      tiempo: "Hace 1 día"
    }
  ]
};

function cargarNoticias() {
  actualizarNoticias(bancoActual);
}

function actualizarNoticias(banco) {
  const cont = document.getElementById("newsContainer");
  const nombreEl = document.getElementById("bankNewsName");
  nombreEl.textContent = banco === "bbva" ? "BBVA" : "Santander";

  cont.innerHTML = "";
  noticias[banco].forEach(n => {
    const card = document.createElement("div");
    card.className = "news-card";
    card.innerHTML = `
      <h4>${n.titulo}</h4>
      <p>${n.descripcion}</p>
      <div class="news-meta">
        <span>${n.fuente} • ${n.tiempo}</span>
        <a href="${n.link}" target="_blank">
          <span class="material-symbols-rounded" style="font-size:15px;">open_in_new</span>
        </a>
      </div>
    `;
    cont.appendChild(card);
  });
}

// ==========================
// 🤖 Modelos de IA
// ==========================
const modelos = {
  bbva: {
    nombre: "Long Short-Term Memory (LSTM)",
    descripcion:
      "Las redes LSTM son un tipo especial de red neuronal recurrente capaz de aprender dependencias a largo plazo. Son efectivas para series temporales como los precios de acciones. Utilizado para predicciones de BBVA.",
    puntos: [
      "Retiene información relevante del pasado mediante 'puertas de memoria'.",
      "Identifica patrones complejos en datos históricos de precios.",
      "Precisa para predicciones a corto y medio plazo."
    ]
  },
  santander: {
    nombre: "Gated Recurrent Unit (GRU)",
    descripcion:
      "Las redes GRU son una variante más eficiente de LSTM. Con menos parámetros, ofrecen un entrenamiento más rápido manteniendo alta precisión en predicciones de series financieras. Utilizado para predicciones de Santander.",
    puntos: [
      "Arquitectura simplificada con dos puertas (reset y update).",
      "Mayor velocidad de entrenamiento y procesamiento.",
      "Excelente para captar tendencias y volatilidad."
    ]
  }
};

function mostrarModelo(tipo) {
  const m = modelos[tipo];
  const cont = document.getElementById("modelContent");
  cont.innerHTML = `
    <h3>${m.nombre}</h3>
    <p>${m.descripcion}</p>
    <ul>${m.puntos.map(p => `<li>${p}</li>`).join("")}</ul>
    <div class="model-note">
      BBVA utiliza LSTM y Santander GRU. Ambos modelos se entrenan con datos históricos y se actualizan continuamente para mejorar la precisión.
    </div>
  `;
}

// Eventos de pestañas
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tabLSTM").addEventListener("click", () => {
    document.getElementById("tabLSTM").classList.add("active");
    document.getElementById("tabGRU").classList.remove("active");
    mostrarModelo("bbva");
  });

  document.getElementById("tabGRU").addEventListener("click", () => {
    document.getElementById("tabGRU").classList.add("active");
    document.getElementById("tabLSTM").classList.remove("active");
    mostrarModelo("santander");
  });

  mostrarModelo("bbva");
});

// 🔁 Integración con cambio de banco
const oldSelectBank = selectBank;
selectBank = function (banco) {
  oldSelectBank(banco);
  actualizarNoticias(banco);
  mostrarModelo(banco);
  cargarCurvaTest(banco);
};

// ==========================
// 📉 Curva de Test — Predicción vs Real
// ==========================
function cargarCurvaTest(banco) {
  const csvPath = `data/test_${banco}.csv`;
  console.log(`📈 Cargando curva de test desde: ${csvPath}`);

  Papa.parse(csvPath, {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function (results) {
      if (!results || !results.data || results.data.length === 0) {
        console.error(`⚠️ No se pudo cargar ${csvPath}`);
        return;
      }

      const datos = results.data;
      const fechas = datos.map(d => d.Date);
      const reales = datos.map(d => d.Real_Close);
      const preds = datos.map(d => d.Pred_Close);

      const colorBase = estilosBanco[banco].color;

      const traceReal = {
        x: fechas,
        y: reales,
        type: "scatter",
        mode: "lines+markers",
        name: "Valor real",
        line: { color: colorBase, width: 2.5, dash: "solid" },
        marker: { color: colorBase, size: 4 }
      };

      const tracePred = {
        x: fechas,
        y: preds,
        type: "scatter",
        mode: "lines+markers",
        name: "Predicción IA",
        line: { color: colorBase, width: 2.5, dash: "dot" },
        marker: { color: colorBase, size: 4, symbol: "circle-open" }
      };

      const layout = {
        paper_bgcolor: "#0b132b",
        plot_bgcolor: "#0b132b",
        font: { color: "#c3cfe2" },
        margin: { t: 60, l: 60, r: 40, b: 50 },
        xaxis: {
          title: "Fecha",
          color: "#c3cfe2",
          showgrid: true,
          gridcolor: "rgba(255,255,255,0.08)"
        },
        yaxis: {
          title: "Precio (€)",
          color: "#c3cfe2",
          showgrid: true,
          gridcolor: "rgba(255,255,255,0.08)"
        },
        legend: {
          orientation: "h",
          y: -0.25,
          font: { size: 11, color: "#c3cfe2" }
        }
      };

      Plotly.newPlot("curvaTest", [traceReal, tracePred], layout, {
        displayModeBar: false,
        responsive: true
      });
    }
  });
}
