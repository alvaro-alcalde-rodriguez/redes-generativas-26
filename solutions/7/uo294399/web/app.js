import '../../../../shared/solution.css';
import catalogue from '../../../../catalogue.json';
import solution from '../solution.json';
import manifest from '../results/manifest.json';
import {
  findGeneration,
  generationsForPrompt,
  getComparisonOptions,
  validateManifest,
} from './manifest.mjs';
import './styles.css';

document.title = `${solution.title} · Redes Generativas`;
document.querySelector('#catalogue-link').href = import.meta.env.BASE_URL;
document.querySelector('#issue-link').href = `${catalogue.repository}/issues/${solution.issue}`;
document.querySelector('#solution-title').textContent = solution.title;
document.querySelector('#solution-summary').textContent = solution.summary;
document.querySelector('#solution-author').textContent = `Por ${solution.author}`;
document.querySelector('#solution-mode').textContent = 'Resultados calculados previamente';

const promptInput = document.querySelector('#prompt-input');
const seedSelect = document.querySelector('#seed-select');
const stepsSelect = document.querySelector('#steps-select');
const axisSelect = document.querySelector('#compare-axis');
const compareValue = document.querySelector('#compare-value');
const generation = document.querySelector('#generation');
const comparison = document.querySelector('#comparison');
const promptStatus = document.querySelector('#prompt-status');
const comparisonStatus = document.querySelector('#comparison-status');
const modelPrompt = document.querySelector('#model-prompt');
let manifestValid = false;

function addOptions(select, values, label = String) {
  select.replaceChildren(
    ...values.map((value) => {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = label(value);
      return option;
    }),
  );
}

function card(item, title) {
  const figure = document.createElement('figure');
  const image = document.createElement('img');
  image.src = `../results/${encodeURIComponent(item.image)}`;
  image.alt = `Imagen generada para «${item.prompt}», semilla ${item.seed}, ${item.steps} ${item.steps === 1 ? 'paso' : 'pasos'}`;
  image.width = item.width;
  image.height = item.height;
  image.loading = 'lazy';
  image.addEventListener('error', () => {
    promptStatus.textContent = `No se pudo cargar el archivo ${item.image}. Comprueba que results/ esté publicado íntegramente.`;
  });

  const caption = document.createElement('figcaption');
  const heading = document.createElement('strong');
  heading.textContent = title;
  const params = document.createElement('span');
  params.textContent = `Semilla ${item.seed} · ${item.steps} ${item.steps === 1 ? 'paso' : 'pasos'} · ${item.width} × ${item.height}`;
  caption.append(heading, params);
  figure.append(image, caption);
  return figure;
}

function clearResults() {
  generation.replaceChildren();
  comparison.replaceChildren();
  modelPrompt.textContent = '';
  seedSelect.replaceChildren();
  stepsSelect.replaceChildren();
  compareValue.replaceChildren();
}

function render() {
  if (!manifestValid) return;
  const prompt = manifest.prompts.find((item) => item.description === promptInput.value);
  if (!prompt) {
    clearResults();
    seedSelect.disabled = true;
    stepsSelect.disabled = true;
    compareValue.disabled = true;
    promptStatus.textContent = 'Elige una descripción de la lista para ver resultados disponibles.';
    comparisonStatus.textContent = '';
    return;
  }

  const promptCases = generationsForPrompt(manifest, prompt.id);
  const previousSeed = Number(seedSelect.value);
  const previousSteps = Number(stepsSelect.value);
  const seeds = [...new Set(promptCases.map((item) => item.seed))].sort((a, b) => a - b);
  seedSelect.disabled = false;
  addOptions(seedSelect, seeds, (seed) => `Semilla ${seed}`);
  seedSelect.value = seeds.includes(previousSeed) ? String(previousSeed) : String(seeds[0]);

  const seedCases = promptCases.filter((item) => item.seed === Number(seedSelect.value));
  const steps = [...new Set(seedCases.map((item) => item.steps))].sort((a, b) => a - b);
  stepsSelect.disabled = false;
  addOptions(stepsSelect, steps, (value) => `${value} ${value === 1 ? 'paso' : 'pasos'}`);
  stepsSelect.value = steps.includes(previousSteps) ? String(previousSteps) : String(steps[0]);

  const selected = findGeneration(manifest, {
    promptId: prompt.id,
    seed: Number(seedSelect.value),
    steps: Number(stepsSelect.value),
  });
  const previousComparison = Number(compareValue.value);
  promptStatus.textContent = `Descripción: ${prompt.description}`;
  modelPrompt.textContent = prompt.modelPrompt;
  generation.replaceChildren(card(selected, 'Generación seleccionada'));

  const candidates = getComparisonOptions(manifest, selected, axisSelect.value);
  addOptions(
    compareValue,
    candidates.map((item) => (axisSelect.value === 'seed' ? item.seed : item.steps)),
    (value) =>
      axisSelect.value === 'seed'
        ? `Semilla ${value}`
        : `${value} ${value === 1 ? 'paso' : 'pasos'}`,
  );
  const comparisonValues = candidates.map((item) =>
    axisSelect.value === 'seed' ? item.seed : item.steps,
  );
  if (comparisonValues.includes(previousComparison)) {
    compareValue.value = String(previousComparison);
  }
  compareValue.disabled = candidates.length === 0;
  const alternative = candidates.find((item) =>
    axisSelect.value === 'seed'
      ? item.seed === Number(compareValue.value)
      : item.steps === Number(compareValue.value),
  );
  if (alternative) {
    comparisonStatus.textContent =
      'Las dos imágenes mantienen la misma descripción y el otro parámetro.';
    comparison.replaceChildren(
      card(selected, 'Configuración seleccionada'),
      card(alternative, 'Configuración alternativa'),
    );
  } else {
    comparisonStatus.textContent =
      'No hay otra imagen exportada que permita variar solo este parámetro para la configuración seleccionada.';
    comparison.replaceChildren(card(selected, 'Configuración seleccionada'));
  }
}

try {
  validateManifest(manifest);
  manifestValid = true;
} catch (error) {
  clearResults();
  promptInput.disabled = true;
  seedSelect.disabled = true;
  stepsSelect.disabled = true;
  axisSelect.disabled = true;
  compareValue.disabled = true;
  promptStatus.textContent = 'No se pudieron cargar los resultados exportados.';
  console.error('Manifiesto de resultados no válido.', error);
}

if (manifestValid) {
  const promptOptions = document.querySelector('#prompt-options');
  for (const prompt of manifest.prompts) {
    const option = document.createElement('option');
    option.value = prompt.description;
    promptOptions.append(option);
  }
  promptInput.value = manifest.prompts[0].description;
}

promptInput.addEventListener('input', render);
seedSelect.addEventListener('change', render);
stepsSelect.addEventListener('change', render);
axisSelect.addEventListener('change', render);
compareValue.addEventListener('change', render);
if (manifestValid) render();
