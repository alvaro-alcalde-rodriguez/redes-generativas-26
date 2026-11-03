import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import manifest from '../solutions/7/uo294399/results/manifest.json' with { type: 'json' };
import {
  findGeneration,
  generationsForPrompt,
  getComparisonOptions,
  validateManifest,
} from '../solutions/7/uo294399/web/manifest.mjs';

const solutionPath = resolve(dirname(fileURLToPath(import.meta.url)), '../solutions/7/uo294399');

test('el manifiesto de imágenes contiene metadatos y combinaciones válidas', () => {
  assert.doesNotThrow(() => validateManifest(manifest));
  assert.ok(manifest.prompts.length >= 2);
  assert.ok(manifest.generations.length >= 6);
});

test('cada combinación del manifiesto tiene un PNG con su resolución declarada', async () => {
  for (const generation of manifest.generations) {
    const path = resolve(solutionPath, 'results', generation.image);
    await access(path);
    const image = await readFile(path);
    assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(image.readUInt32BE(16), manifest.resolution.width);
    assert.equal(image.readUInt32BE(20), manifest.resolution.height);
  }
});

test('la comparación cambia un solo parámetro a la vez', () => {
  const prompt = manifest.prompts[0].id;
  const current = generationsForPrompt(manifest, prompt)[0];
  const alternativesBySeed = getComparisonOptions(manifest, current, 'seed');
  const alternativesBySteps = getComparisonOptions(manifest, current, 'steps');

  assert.ok(alternativesBySeed.length > 0);
  assert.ok(alternativesBySteps.length > 0);
  assert.ok(alternativesBySeed.every((item) => item.steps === current.steps));
  assert.ok(alternativesBySeed.every((item) => item.seed !== current.seed));
  assert.ok(alternativesBySteps.every((item) => item.seed === current.seed));
  assert.ok(alternativesBySteps.every((item) => item.steps !== current.steps));
});

test('el selector solo encuentra configuraciones exportadas', () => {
  const promptId = manifest.prompts[0].id;
  const available = manifest.generations.find((item) => item.promptId === promptId);
  assert.equal(
    findGeneration(manifest, {
      promptId,
      seed: available.seed,
      steps: available.steps,
    }),
    available,
  );
  assert.equal(
    findGeneration(manifest, { promptId, seed: 999_999, steps: available.steps }),
    undefined,
  );
});

test('el manifiesto rechaza rutas de imagen y combinaciones duplicadas', () => {
  const unsafe = structuredClone(manifest);
  unsafe.generations[0].image = '../outside.png';
  assert.throws(() => validateManifest(unsafe), /generación incompleta/);

  const duplicated = structuredClone(manifest);
  duplicated.generations.push({ ...duplicated.generations[0] });
  assert.throws(() => validateManifest(duplicated), /generación incompleta/);
});
