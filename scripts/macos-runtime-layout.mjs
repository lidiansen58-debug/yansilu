import path from "node:path";

export function universalLibnodeName(armFiles = [], intelFiles = []) {
  const isLibnode = name => /^libnode(?:\.\d+)*\.dylib$/u.test(name);
  const arm = armFiles.filter(isLibnode);
  const intel = intelFiles.filter(isLibnode);
  if (!arm.length && !intel.length) return "";
  const shared = arm.find(name => intel.includes(name));
  if (!shared) {
    throw new Error("The ARM and Intel Node distributions do not provide matching libnode dylibs.");
  }
  return shared;
}

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
