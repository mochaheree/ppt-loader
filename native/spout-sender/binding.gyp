{
  "targets": [
    {
      "target_name": "spout_sender",
      # Node 24's common.gypi forces ClangCL (upstream builds with it); pin to
      # the MSVC toolset that VS Build Tools actually ships with.
      "configurations": {
        "Release": { "msbuild_toolset": "v143" },
        "Debug": { "msbuild_toolset": "v143" }
      },
      "conditions": [
        ["OS=='win'", {
          "sources": [
            "src/spout_sender.cc",
            "spout-sdk/SpoutDX.cpp",
            "spout-sdk/SpoutCopy.cpp",
            "spout-sdk/SpoutDirectX.cpp",
            "spout-sdk/SpoutFrameCount.cpp",
            "spout-sdk/SpoutSenderNames.cpp",
            "spout-sdk/SpoutSharedMemory.cpp",
            "spout-sdk/SpoutUtils.cpp"
          ],
          "include_dirs": [
            "../../node_modules/node-addon-api",
            "spout-sdk"
          ],
          "libraries": [
            "-ld3d11.lib",
            "-ldxgi.lib",
            "-lpsapi.lib",
            "-lshlwapi.lib"
          ],
          # NAPI_VERSION=8 keeps one binary loadable by both Node and Electron.
          "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS", "NAPI_VERSION=8"],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1,
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }]
      ]
    }
  ]
}
