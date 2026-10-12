import test from 'node:test';
import assert from 'node:assert/strict';
import {syncToastuiKeyboardSelection} from '../../apps/web/src/toastui-keyboard-selection.js';

function fixture({anchor=99,head=99,stateAnchor=20,stateHead=30}={}) {
 const anchorNode={},focusNode={},calls=[];
 const selection={rangeCount:1,anchorNode,focusNode,anchorOffset:anchor,focusOffset:head};
 const doc={content:{size:100},resolve:()=>({parent:{isTextblock:true}})};
 const view={dom:{ownerDocument:{getSelection:()=>selection},contains:node=>node===anchorNode||node===focusNode},state:{doc,selection:{anchor:stateAnchor,head:stateHead}},posAtDOM:(_node,offset)=>offset};
 const editor={isWysiwygMode:()=>true,wwEditor:{view},setSelection:(...args)=>calls.push(args)};
 return {editor,view,selection,doc,calls};
}

test('editing keys reconcile a newer DOM caret without modifying the document',()=>{
 for(const key of ['Enter','Backspace','Delete']){const f=fixture();assert.equal(syncToastuiKeyboardSelection(f.editor,{key}),true);assert.deepEqual(f.calls,[[99,99]]);assert.equal(f.view.state.doc,f.doc);}
});
test('a backward DOM selection retains its anchor and head',()=>{
 const f=fixture({anchor:80,head:60});assert.equal(syncToastuiKeyboardSelection(f.editor,{key:'Enter'}),true);assert.deepEqual(f.calls,[[80,60]]);
});
test('composition and navigation keys do not replace editor state',()=>{
 for(const event of [{key:'Enter',isComposing:true},{key:'Enter',keyCode:229},{key:'End'}]){const f=fixture();assert.equal(syncToastuiKeyboardSelection(f.editor,event),false);assert.deepEqual(f.calls,[]);}
 const f=fixture();f.view.composing=true;assert.equal(syncToastuiKeyboardSelection(f.editor,{key:'Enter'}),false);assert.deepEqual(f.calls,[]);
});
test('an external selection, boundary or detached position is not applied',()=>{
 const external=fixture();external.selection.anchorNode={};assert.equal(syncToastuiKeyboardSelection(external.editor,{key:'Enter'}),false);assert.deepEqual(external.calls,[]);
 const boundary=fixture();boundary.doc.resolve=()=>({parent:{isTextblock:false}});assert.equal(syncToastuiKeyboardSelection(boundary.editor,{key:'Enter'}),false);assert.deepEqual(boundary.calls,[]);
 const detached=fixture();detached.view.posAtDOM=()=>{throw Error('Detached');};assert.equal(syncToastuiKeyboardSelection(detached.editor,{key:'Enter'}),false);assert.deepEqual(detached.calls,[]);
});
test('a synchronized caret and source mode remain unchanged',()=>{
 const synced=fixture({stateAnchor:99,stateHead:99});assert.equal(syncToastuiKeyboardSelection(synced.editor,{key:'Enter'}),false);assert.deepEqual(synced.calls,[]);
 const source=fixture();source.editor.isWysiwygMode=()=>false;assert.equal(syncToastuiKeyboardSelection(source.editor,{key:'Enter'}),false);assert.deepEqual(source.calls,[]);
});
test('a focused widget keeps its selection and keyboard action',()=>{
 const f=fixture();const target=f.selection.anchorNode;target.closest=()=>target;assert.equal(syncToastuiKeyboardSelection(f.editor,{key:'Enter',target}),false);assert.deepEqual(f.calls,[]);
});
test('an outer noneditable wrapper does not override its editable child',()=>{
 const f=fixture();const target=f.selection.anchorNode;target.closest=()=>({});assert.equal(syncToastuiKeyboardSelection(f.editor,{key:'Enter',target}),true);assert.deepEqual(f.calls,[[99,99]]);
});
