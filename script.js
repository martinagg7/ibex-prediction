document.addEventListener("DOMContentLoaded", () => {
  const bankCards = document.querySelectorAll(".bank-card");
  const intervalBtns = document.querySelectorAll(".interval-btn");
  const chartTitle = document.getElementById("chart-title");

  let selectedBank = "bbva";
  let selectedDays = 7;

  // === Selección de banco ===
  bankCards.forEach(card => {
    card.addEventListener("click", () => {
      bankCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      selectedBank = card.dataset.bank;
      updateChart();
    });
  });

  // === Selección de intervalo ===
  intervalBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      intervalBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDays = btn.dataset.days;
      updateChart();
    });
  });

  // === Lógica del gráfico ===
  function updateChart() {
    chartTitle.textContent = `Evolución de ${selectedBank.toUpperCase()} (últimos ${selectedDays} días)`;
    // Aquí luego haremos fetch a la API o cambiaremos los datos del gráfico
  }

  updateChart();
});
