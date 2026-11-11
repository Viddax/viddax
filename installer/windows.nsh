!macro customInstall
  Push $0
  SetOutPath "$INSTDIR"

  # Limit compression to files Viddax owns in a user-selected install directory.
  nsExec::ExecToLog /TIMEOUT=30000 '"$SYSDIR\compact.exe" /C /I /Q /EXE:XPRESS4K Viddax.exe chrome_100_percent.pak chrome_200_percent.pak d3dcompiler_47.dll dxcompiler.dll dxil.dll ffmpeg.dll icudtl.dat libEGL.dll libGLESv2.dll resources.pak snapshot_blob.bin v8_context_snapshot.bin vk_swiftshader.dll vulkan-1.dll LICENSES.chromium.html locales\en-US.pak resources\app.asar resources\app.asar.unpacked\bin\ffmpeg.exe resources\app.asar.unpacked\bin\ffprobe.exe resources\app.asar.unpacked\bin\yt-dlp.exe'
  Pop $0
  DetailPrint "Windows executable compression result: $0"

  Pop $0
!macroend
