export function validateManifest(manifest) {
  if (
    !manifest ||
    typeof manifest.model !== 'string' ||
    typeof manifest.revision !== 'string' ||
    !Number.isInteger(manifest.resolution?.width) ||
    !Number.isInteger(manifest.resolution?.height) ||
    !Array.isArray(manifest.prompts) ||
    !Array.isArray(manifest.generations) ||
    manifest.prompts.length === 0 ||
    manifest.generations.length === 0
  ) {
    throw new Error('Faltan metadatos, descripciones o generaciones.');
  }

  const prompts = new Map();
  for (const prompt of manifest.prompts) {
    if (
      typeof prompt.id !== 'string' ||
      !prompt.id ||
      typeof prompt.title !== 'string' ||
      typeof prompt.description !== 'string' ||
      !prompt.description.trim() ||
      typeof prompt.modelPrompt !== 'string' ||
      !prompt.modelPrompt.trim() ||
      prompts.has(prompt.id)
    ) {
      throw new Error('Cada descripción debe tener un identificador único y textos no vacíos.');
    }
    prompts.set(prompt.id, prompt);
  }

  const combinations = new Set();
  const images = new Set();
  for (const item of manifest.generations) {
    const key = `${item.promptId}:${item.seed}:${item.steps}`;
    if (
      !prompts.has(item.promptId) ||
      typeof item.image !== 'string' ||
      !/^[A-Za-z0-9._-]+\.png$/i.test(item.image) ||
      !Number.isSafeInteger(item.seed) ||
      item.seed < 0 ||
      !Number.isInteger(item.steps) ||
      item.steps < 1 ||
      item.steps > 4 ||
      !Number.isFinite(item.guidanceScale) ||
      item.width !== manifest.resolution.width ||
      item.height !== manifest.resolution.height ||
      typeof item.prompt !== 'string' ||
      !item.prompt.trim() ||
      item.prompt !== prompts.get(item.promptId).modelPrompt ||
      combinations.has(key) ||
      images.has(item.image)
    ) {
      throw new Error('Hay una generación incompleta o una combinación duplicada.');
    }
    combinations.add(key);
    images.add(item.image);
  }
  if (
    [...prompts.keys()].some(
      (promptId) => !manifest.generations.some((item) => item.promptId === promptId),
    )
  ) {
    throw new Error('Cada descripción debe tener al menos una imagen exportada.');
  }
}

export function generationsForPrompt(manifest, promptId) {
  return manifest.generations.filter((item) => item.promptId === promptId);
}

export function findGeneration(manifest, { promptId, seed, steps }) {
  return manifest.generations.find(
    (item) => item.promptId === promptId && item.seed === seed && item.steps === steps,
  );
}

export function getComparisonOptions(manifest, selected, axis) {
  if (axis === 'seed') {
    return manifest.generations.filter(
      (item) =>
        item.promptId === selected.promptId &&
        item.steps === selected.steps &&
        item.seed !== selected.seed,
    );
  }
  if (axis === 'steps') {
    return manifest.generations.filter(
      (item) =>
        item.promptId === selected.promptId &&
        item.seed === selected.seed &&
        item.steps !== selected.steps,
    );
  }
  throw new Error(`Eje de comparación no válido: ${axis}`);
}
