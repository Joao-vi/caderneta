import {
  BarController, BarElement, CategoryScale, Chart, Filler, Legend, LineController,
  LineElement, LinearScale, PointElement, Tooltip,
} from 'chart.js';

Chart.register(
  BarController, BarElement, CategoryScale, Filler, Legend, LineController,
  LineElement, LinearScale, PointElement, Tooltip,
);

export const GRID = '#E4E0D0';

export const eixoBase = (titulo) => ({
  title: { display: true, text: titulo },
  grid: { color: GRID },
});
