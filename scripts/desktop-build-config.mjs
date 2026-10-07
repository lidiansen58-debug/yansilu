export function desktopBuildConfig(source, { platform, updaterArtifacts }) {
  const config = structuredClone(source);
  config.bundle.createUpdaterArtifacts = updaterArtifacts;
  if (platform === "linux") {
    // Debian package names are ASCII; the desktop entry keeps the visible brand.
    config.productName = "yansilu";
    config.bundle.linux = {
      ...config.bundle.linux,
      deb: {
        ...config.bundle.linux?.deb,
        desktopTemplate: "linux/yansilu.desktop.hbs"
      }
    };
  }
  return config;
}
