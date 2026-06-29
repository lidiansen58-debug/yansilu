export function installSettingsFeedbackEventBindings(deps = {}) {
  const {
    $ = () => null,
    feedbackRepositoryReady = false,
    copyTextToClipboard = async () => {},
    buildFeedbackDiagnosticText = () => "",
    buildFeedbackUrl = () => "",
    openFeedbackUrl = async () => false,
    setStatus = () => {}
  } = deps;

  $("settingsCopyFeedbackDiagnostics")?.addEventListener("click", async () => {
    try {
      await copyTextToClipboard(buildFeedbackDiagnosticText());
      setStatus("已复制问题信息", "ok");
    } catch (error) {
      setStatus(`复制问题信息失败：${String(error?.message || error)}`, "bad");
    }
  });

  $("settingsOpenBugReport")?.addEventListener("click", async () => {
    if (!feedbackRepositoryReady) {
      setStatus("反馈仓库还没绑定，先把 FEEDBACK_REPOSITORY 改成真实 owner/repo", "warn");
      return;
    }
    if (await openFeedbackUrl(buildFeedbackUrl("bug"))) {
      setStatus("已打开问题反馈入口", "ok");
      return;
    }
    setStatus("没有成功打开反馈入口，请检查浏览器是否拦截了新窗口", "warn");
  });

  $("settingsOpenFeatureRequest")?.addEventListener("click", async () => {
    if (!feedbackRepositoryReady) {
      setStatus("反馈仓库还没绑定，先把 FEEDBACK_REPOSITORY 改成真实 owner/repo", "warn");
      return;
    }
    if (await openFeedbackUrl(buildFeedbackUrl("feature"))) {
      setStatus("已打开功能建议入口", "ok");
      return;
    }
    setStatus("没有成功打开建议入口，请检查浏览器是否拦截了新窗口", "warn");
  });
}
