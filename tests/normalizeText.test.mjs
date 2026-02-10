import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeText } from '../utils/normalizeText.js';

test('normaliza cafe/café igual', () => {
  assert.equal(normalizeText('café'), normalizeText('cafe'));
  assert.equal(normalizeText('café'), 'cafe');
});

test('normaliza espacios y mayúsculas en Pollo', () => {
  assert.equal(normalizeText(' Pollo  '), normalizeText('pollo'));
  assert.equal(normalizeText(' Pollo  '), 'pollo');
});

test('normaliza Aceite de Oliva con espacios/capitalización', () => {
  assert.equal(normalizeText('Aceite de Oliva'), normalizeText('aceite de oliva'));
  assert.equal(normalizeText('Aceite   de   Oliva'), 'aceite de oliva');
});
