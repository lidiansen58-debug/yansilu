import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAiInboxDetailForRuntime,refreshAiInboxForRuntime} from '../../apps/web/src/ai-inbox-runtime-controller.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

function harness(fetchAiInbox) {
  const state = {filters: {view: 'pending', sourceNoteId: 'old-source'}, items: [],
    selectedArtifactId: '', detail: null, detailRequestToken: 0, detailLoading: false};
  const statuses = [];
  const item = id => ({artifactId: id, suggestionId: `suggestion-${id}`, status: 'suggested',
    actionState: 'suggested', updatedAt: 'same-version', decisionCount: 0});
  const deps = {aiInboxState: state, normalizeAiInboxFilters: value => ({...value}),
    aiInboxItemFromCanonical: value => value, fetchAiInbox,
    setStatus: message => statuses.push(message)};
  const select = id => loadAiInboxDetailForRuntime({aiInboxState: state,
    fetchAiInboxItemWithOptions: async () => ({item: item(id), suggestion: {id: `suggestion-${id}`, status: 'suggested'}}),
    aiInboxDetailFromResponse: value => value}, id);
  deps.loadDetail = select;
  return {state, statuses, item, select, refresh: () => refreshAiInboxForRuntime(deps)};
}

for (const outcome of ['success', 'failure']) {
  test(`a late ${outcome} from an older inbox filter preserves the newer selection and actions`, async () => {
    const old = deferred();
    const h = harness(filters => filters.sourceNoteId === 'old-source'
      ? old.promise : Promise.resolve({items: [h.item('current')]}));
    const pendingOld = h.refresh();
    h.state.filters = {...h.state.filters, sourceNoteId: 'current-source'};
    await h.refresh();
    const detail = h.state.detail;
    if (outcome === 'success') old.resolve({items: [h.item('older')]});
    else old.reject(new Error('Old request failed after the current one succeeded'));
    await pendingOld;
    assert.equal(h.state.selectedArtifactId, 'current');
    assert.equal(h.state.detail, detail);
    assert.equal(h.state.detail.suggestion.id, 'suggestion-current');
    assert.deepEqual(h.state.items, [h.item('current')]);
    assert.equal(h.state.error, '');
    assert.equal(h.state.loading, false);
    assert.deepEqual(h.statuses, []);
  });
}

test('a list refresh preserves a newer user selection made while that request is pending', async () => {
  const response = deferred();
  const h = harness(() => response.promise);
  await h.select('first');
  const pending = h.refresh();
  await h.select('second');
  const detail = h.state.detail;
  response.resolve({items: [h.item('first'), h.item('second')]});
  await pending;
  assert.equal(h.state.selectedArtifactId, 'second');
  assert.equal(h.state.detail, detail);
  assert.equal(h.state.detail.suggestion.id, 'suggestion-second');
});

test('a response for filters that have changed cannot populate that different filter scope', async () => {
  const response = deferred();
  const h = harness(() => response.promise);
  const pending = h.refresh();
  h.state.filters = {...h.state.filters, sourceNoteId: 'different-source'};
  response.resolve({items: [h.item('older')]});
  await pending;
  assert.equal(h.state.filters.sourceNoteId, 'different-source');
  assert.deepEqual(h.state.items, []);
  assert.equal(h.state.selectedArtifactId, '');
  assert.equal(h.state.detail, null);
  assert.equal(h.state.loading, false);
});

test('finishing an older request does not dismiss the current loading state or expose its items', async () => {
  const old = deferred(), current = deferred();
  const h = harness(filters => filters.sourceNoteId === 'old-source' ? old.promise : current.promise);
  const pendingOld = h.refresh();
  h.state.filters = {...h.state.filters, sourceNoteId: 'current-source'};
  const pendingCurrent = h.refresh();
  old.resolve({items: [h.item('older')]});
  await pendingOld;
  assert.equal(h.state.loading, true);
  assert.deepEqual(h.state.items, []);
  assert.equal(h.state.selectedArtifactId, '');
  current.resolve({items: [h.item('current')]});
  await pendingCurrent;
  assert.equal(h.state.loading, false);
  assert.equal(h.state.selectedArtifactId, 'current');
});
