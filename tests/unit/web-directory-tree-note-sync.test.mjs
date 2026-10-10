import test from 'node:test';
import assert from 'node:assert/strict';
import { syncDirectoryTreeNotes } from '../../apps/web/src/directory-tree-note-sync.js';

function context() {
  const state = { noteMoveVaultScope: {}, folders: [{ id: 'root' }, { id: 'child' }, { id: 'empty' }] };
  const applied = [];
  return { state, applied, deps: {
    state, descendantDirectoryIds: () => ['root', 'child', 'empty', 'missing'],
    folderById: (current, id) => current.folders.find(folder => folder.id === id),
    mapNoteItem: note => ({ ...note, folderId: note.directoryId }),
    upsertNotesForDirectory: (id, notes) => applied.push([id, notes.map(note => note.id)])
  } };
}

test('one subtree request updates each real directory, including empty ones, without touching other roots', async () => {
  const { deps, applied } = context();
  let reads = 0;
  assert.equal(await syncDirectoryTreeNotes('root', { ...deps, fetchDirectoryNotes: async (id, options) => {
    reads++;
    assert.equal(id, 'root');
    assert.deepEqual(options, { includeDescendants: true });
    return [{ id: 'r', directoryId: 'root' }, { id: 'c', directoryId: 'child' }, { id: 'outside', directoryId: 'other' }];
  } }), true);
  assert.equal(reads, 1);
  assert.deepEqual(applied, [['root', ['r']], ['child', ['c']], ['empty', []]]);
});

for (const change of ['scope', 'switching', 'deleted-folder']) {
  test(`subtree read does not restore stale ${change} state`, async () => {
    const { state, deps, applied } = context();
    let finish;
    const pending = syncDirectoryTreeNotes('root', { ...deps, fetchDirectoryNotes: () => new Promise(resolve => { finish = resolve; }) });
    if (change === 'scope') state.noteMoveVaultScope = {};
    if (change === 'switching') state.noteMoveVaultSwitching = true;
    if (change === 'deleted-folder') state.folders = state.folders.filter(folder => folder.id !== 'child');
    finish([{ id: 'c', directoryId: 'child' }]);
    assert.equal(await pending, change === 'deleted-folder');
    assert.deepEqual(applied, change === 'deleted-folder' ? [['root', []], ['empty', []]] : []);
  });
}

test('unknown roots, active switches and failures do not partially apply directory results', async () => {
  const { state, deps, applied } = context();
  const fail = async () => { throw new Error('读取失败'); };
  assert.equal(await syncDirectoryTreeNotes('', { ...deps, fetchDirectoryNotes: fail }), false);
  state.noteMoveVaultSwitching = true;
  assert.equal(await syncDirectoryTreeNotes('root', { ...deps, fetchDirectoryNotes: fail }), false);
  state.noteMoveVaultSwitching = false;
  await assert.rejects(syncDirectoryTreeNotes('root', { ...deps, fetchDirectoryNotes: fail }), /读取失败/);
  assert.deepEqual(applied, []);
});

test('subtree hydration honors the caller context after a late response', async () => {
  const { deps, applied } = context();
  let current = true, finish;
  const work = syncDirectoryTreeNotes('root', { ...deps, isCurrent: () => current,
    fetchDirectoryNotes: () => new Promise(resolve => { finish = resolve; }) });
  current = false; finish([{ id: 'old', directoryId: 'root' }]);
  assert.equal(await work, false);
  assert.deepEqual(applied, []);
});
