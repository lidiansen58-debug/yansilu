export function installSettingsFeedbackEventBindings(deps = {}) {
  const {
    $ = () => null,
    buildFeedbackMailtoUrl = () => "",
    openFeedbackMailtoUrl = async () => false,
    setStatus = () => {}
  } = deps;

  $("settingsOpenFeedbackEmail")?.addEventListener("click", async () => {
    if (await openFeedbackMailtoUrl(buildFeedbackMailtoUrl())) {
      setStatus("已打开反馈邮件", "ok");
      return;
    }
    setStatus("没有成功打开邮件，请确认已设置默认邮件应用", "warn");
  });
}
