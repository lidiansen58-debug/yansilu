export function beginSourceDistillRequest(editor) {
  editor.sourceDistillRequest?.controller?.abort();
  const request = { controller: new AbortController() };
  editor.sourceDistillRequest = request;
  return request;
}

export function cancelSourceDistillRequest(editor) {
  const running = editor.sourceDistillAiState?.status === "running";
  editor.sourceDistillRequest?.controller?.abort();
  editor.sourceDistillRequest = null;
  if (running) {
    editor.setSourceDistillAiState({
      ...editor.sourceDistillAiState,
      status: "ignored", cancelled: true, cancellable: false,
      result: null, error: ""
    });
  } else {
    editor.setSourceDistillAiState(null);
  }
  editor.onStatus(running ? "已取消提炼，原笔记未修改。" : "已关闭提炼结果", "ok");
}
