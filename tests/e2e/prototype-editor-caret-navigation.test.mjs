import test from 'node:test';
import assert from 'node:assert/strict';
import {optionalPlaywright,startPrototypeStack,postJson,fetchJson} from './prototype-copy-test-helpers.mjs';

for(const key of ['Enter','Backspace','Delete'])test(`rich ${key} uses the latest DOM caret when navigation has not reached editor state`,async t=>{
 if(process.env.RUN_BROWSER_E2E!=='1'){t.skip('Set RUN_BROWSER_E2E=1');return;}
 const pw=await optionalPlaywright(t);if(!pw)return;const stack=await startPrototypeStack(t,pw);if(!stack)return;
 const {page,apiBase,webBase}=stack;
 const body='# 光标导航后的输入\n\n'+Array.from({length:15},(_,i)=>`[CARET-${i+1}] 中文 café 🌿，已有内容${i+1}。`).join('\n\n');
 const created=await postJson(apiBase,'/api/v1/notes',{directoryId:'dir_fleeting_default',body});assert.equal(created.status,201);const note=created.json.item;
 await page.goto(webBase+'/prototype',{waitUntil:'networkidle'});await page.locator('[data-action="quick-fleeting"]').click();await page.locator(`.explorer-item[data-kind="file"][data-id="${note.id}"]`).click();
 await page.waitForFunction(id=>window.__prototypeEditor.activeNote()?.id===id,note.id);
 if(!await page.evaluate(()=>window.__prototypeEditor.isWysiwygMode()))await page.locator('#btnModeToggle').click();
 await page.locator('#wysiwygHost .ProseMirror:visible').click();
 await page.waitForFunction(()=>window.__prototypeEditor.richEditor?.editor?.wwEditor?.view?.state.doc.textContent.includes('[CARET-12]'));
 // A native Ctrl+End can move the DOM caret before selectionchange updates
 // ProseMirror. Hold that observer to replay the actual installed-app trace.
 await page.evaluate(()=>{
  const editor=window.__prototypeEditor.richEditor.editor,view=editor.wwEditor.view;
  let block;view.state.doc.descendants((node,pos)=>{if(node.isTextblock&&node.textContent.includes('[CARET-12]'))block={from:pos+1,to:pos+node.nodeSize-1};});
  editor.setSelection(block.from,block.to);view.focus();view.domObserver.stop();
  const walker=document.createTreeWalker(view.dom,NodeFilter.SHOW_TEXT);let last;while(walker.nextNode())last=walker.currentNode;
  const selection=view.dom.ownerDocument.getSelection();selection.setBaseAndExtent(last,last.textContent.length,last,last.textContent.length);
  window.__caretNavigationObserver=view.domObserver;
  if(view.state.selection.empty)throw Error('The stale editor selection was not established');
  if(!selection.isCollapsed)throw Error('The real DOM caret must already be collapsed at document end');
 });
 try{await page.keyboard.press(key);}finally{await page.evaluate(()=>window.__caretNavigationObserver.start());}
 if(key==='Enter')await page.keyboard.insertText('文末新增内容');
 await page.keyboard.press('Control+s');await page.waitForFunction(()=>!window.__prototypeEditor.savingPromise&&!window.__prototypeEditor.activeTab()?.dirty);
 const saved=(await fetchJson(apiBase,'/api/v1/notes/'+note.id)).json.item;
 for(let i=1;i<=15;i++)assert(saved.body.includes(`[CARET-${i}]`),`Existing paragraph ${i} must survive ${key} at the new caret`);
 if(key==='Enter')assert(saved.body.trimEnd().endsWith('文末新增内容'),'New text belongs at the document end');
 else assert.equal(saved.body.trimEnd(),key==='Backspace'?body.slice(0,-1):body,'Only a character at the new caret may be removed');
});
