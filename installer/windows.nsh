!macro RunViddaxSetup MODE EXE EXISTING
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "/oname=$PLUGINSDIR\ViddaxSetup.exe" "${BUILD_RESOURCES_DIR}\viddax-setup-ui.exe"
  ClearErrors
  ExecWait '"$PLUGINSDIR\ViddaxSetup.exe" ${MODE} "${EXE}" "$INSTDIR" "${VERSION}" "${EXISTING}" "$installMode"' $0
  ${if} ${Errors}
    MessageBox MB_ICONSTOP "The Viddax setup interface could not start."
    SetErrorLevel 1
  ${else}
    SetErrorLevel $0
  ${endif}
  Quit
!macroend

!macro preInit
  !ifndef BUILD_UNINSTALLER
    ${if} ${isUpdated}
      SetSilent silent
    ${endif}
    ${ifNot} ${Silent}
      !insertmacro check64BitAndSetRegView
      !insertmacro initMultiUser
      IntOp $R0 $hasPerUserInstallation + $hasPerMachineInstallation
      !insertmacro RunViddaxSetup install "$EXEPATH" "$R0"
    ${endif}
  !endif
!macroend

!macro customUnInit
  ${ifNot} ${Silent}
    !insertmacro RunViddaxSetup uninstall "$INSTDIR\${UNINSTALL_FILENAME}" "1"
  ${endif}
!macroend

!macro customInstall
  Push $0
  SetOutPath "$INSTDIR"

  # Limit compression to files Viddax owns in a user-selected install directory.
  nsExec::ExecToLog /TIMEOUT=30000 '"$SYSDIR\compact.exe" /C /I /Q /EXE:XPRESS4K Viddax.exe chrome_100_percent.pak chrome_200_percent.pak d3dcompiler_47.dll dxcompiler.dll dxil.dll ffmpeg.dll icudtl.dat libEGL.dll libGLESv2.dll resources.pak snapshot_blob.bin v8_context_snapshot.bin vk_swiftshader.dll vulkan-1.dll LICENSES.chromium.html locales\en-US.pak resources\app.asar resources\app.asar.unpacked\bin\ffmpeg.exe resources\app.asar.unpacked\bin\ffprobe.exe resources\app.asar.unpacked\bin\yt-dlp.exe'
  Pop $0
  DetailPrint "Windows executable compression result: $0"

  Pop $0
!macroend
