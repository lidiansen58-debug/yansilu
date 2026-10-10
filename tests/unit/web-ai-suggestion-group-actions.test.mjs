import test from 'node:test';
import assert from 'node:assert/strict';
import { applySuggestionGroup } from '../../apps/web/src/ai-suggestion-group-actions.js';

function fixture() {
  const items = ['thesis', 'threeLineSummary'].map(field => ({ id: field, status: 'suggested', updatedAt: 'preview',
    target: { type: 'permanent_note', id: 'note', field }, content: { [field]: field === 'thesis' ? 'thesis' : ['summary'] } }));
  const base = { vaultPath: 'original-vault', noteId: 'note', fileRevision: 'displayed-file' };
  const state = { suggestions: items, selectedSuggestionId: 'thesis', suggestionDetail: { item: items[0],
    writeBase: { ...base, suggestionRevision: 'thesis-review' } } };
  const calls = [];
  const deps = { settingsAiState: state, render() {},
    async loadAiSuggestionDetail(id) {
      calls.push(['load', id]);
      state.suggestionDetail = { item: items.find(item => item.id === id),
        writeBase: { ...base, fileRevision: 'untrusted-fresh-file', suggestionRevision: id + '-review' } };
    },
    async applyAiSuggestionStatus(id, status, options) {
      calls.push(['write', id, { ...options.writeBase }]);
      options.onNoteWritten({ ...base, fileRevision: 'our-first-write' });
      return { id, status };
    }
  };
  return { state, calls, deps };
}

test('group uses the displayed baseline and advances it only from our successful write receipt', async () => {
  const { state, calls, deps } = fixture();
  await applySuggestionGroup(deps, ['thesis', 'threeLineSummary'], 'adopted_as_draft');
  assert.deepEqual(calls, [
    ['write', 'thesis', { vaultPath: 'original-vault', noteId: 'note', fileRevision: 'displayed-file', suggestionRevision: 'thesis-review' }],
    ['load', 'threeLineSummary'],
    ['write', 'threeLineSummary', { vaultPath: 'original-vault', noteId: 'note', fileRevision: 'our-first-write', suggestionRevision: 'threeLineSummary-review' }]
  ]);
  assert.equal(state.selectedSuggestionId, '');
  assert.equal(state.suggestionGroupActionLoading, false);
});

test('a failed group write retains the displayed detail and error, and stops before writing peers', async () => {
  const { state, calls, deps } = fixture();
  const detail = state.suggestionDetail;
  deps.applyAiSuggestionStatus = async () => { state.suggestionActionError = 'conflict'; return null; };
  await applySuggestionGroup(deps, ['thesis', 'threeLineSummary'], 'adopted_as_draft');
  assert.equal(state.suggestionDetail, detail);
  assert.equal(state.selectedSuggestionId, 'thesis');
  assert.equal(state.suggestionActionError, 'conflict');
  assert.deepEqual(calls, []);
});

test('an already running group cannot start duplicate detail loads or writes', async () => {
  const { state, calls, deps } = fixture();
  state.suggestionGroupActionLoading = true;
  await applySuggestionGroup(deps, ['thesis', 'threeLineSummary'], 'adopted_as_draft');
  assert.deepEqual(calls, []);
  assert.equal(state.suggestionGroupActionLoading, true);
});

test('changed peer content is not silently accepted by a fresh detail load', async () => {
  const { state, calls, deps } = fixture();
  const load = deps.loadAiSuggestionDetail;
  deps.loadAiSuggestionDetail = async id => {
    await load(id);
    state.suggestionDetail.item = { ...state.suggestionDetail.item, content: { threeLineSummary: ['Changed elsewhere'] } };
  };
  await applySuggestionGroup(deps, ['thesis', 'threeLineSummary'], 'adopted_as_draft');
  assert.equal(calls.filter(call => call[0] === 'write').length, 1);
  assert.match(state.suggestionActionError, /建议已经变化/);
  assert.ok(state.suggestionDetail);
});

test('missing displayed note baseline blocks the group instead of taking a fresh unreviewed baseline', async () => {
  const { state, calls, deps } = fixture();
  delete state.suggestionDetail.writeBase;
  await applySuggestionGroup(deps, ['thesis'], 'adopted_as_draft');
  assert.deepEqual(calls, []);
  assert.match(state.suggestionActionError, /缺少笔记版本/);
});
