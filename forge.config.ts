import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    executableName: "kenmei-to-anilist",
    asar: true,
    appCopyright: `Copyright © ${new Date().getFullYear()}`,
    //icon: "./src/assets/KenmeiToAnilistIconTransparent",
    appVersion: "1.0.0",
    buildVersion: "1.0.0",
    appBundleId: "com.rlapps.kenmeitoanilist",
    name: "Kenmei to Anilist",
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      //setupIcon: "./src/assets/KenmeiToAnilistIconTransparent.ico",
      //iconUrl:
      //  "https://raw.githubusercontent.com/RLAlpha49/Kenmei-to-Anilist/refs/heads/master/src/assets/KenmeiToAnilistIconTransparent.ico",
      setupExe: "Kenmei-to-Anilist-Setup.exe",
      noMsi: false,
      name: "KenmeiToAnilist",
      setupMsi: "Kenmei-to-Anilist-Setup.msi",
    }),
    new MakerDMG(
      {
        name: "Kenmei-to-Anilist",
        //icon: "./src/assets/KenmeiToAnilistIconTransparent.icns",
        format: "ULFO",
      },
      ["darwin"],
    ),
    new MakerZIP({}, ["darwin"]),
    new MakerDeb({
      options: {
        name: "kenmei-to-anilist",
        productName: "Kenmei to Anilist",
        maintainer: "Alex Pettigrew",
        //homepage: "https://github.com/RLAlpha49/Kenmei-to-Anilist",
        //icon: "./src/assets/KenmeiToAnilistIconTransparent.png",
        version: "1.0.0",
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
