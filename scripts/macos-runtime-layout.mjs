import path from "node:path";

export function macosNodeRuntimeLayout(runtimeRoot = "") {
  const root = path.resolve(runtimeRoot);
  return {
    nodePath: path.join(root, "node", "node"),
    libraryDir: path.join(root, "lib")
  };
}

export function macosDmgLayout({ appPath = "", outputPath = "", volumeName = "" } = {}) {
  const app = path.resolve(appPath);
  const output = path.resolve(outputPath);
  const name = String(volumeName || path.basename(app, ".app") || "Yansilu").trim();
  return {
    appPath: app,
    outputPath: output,
    volumeName: name,
    applicationsLinkName: "Applications"
  };
}
