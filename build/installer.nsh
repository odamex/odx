; Custom NSIS script for ODX installer
; This creates a writable data directory next to the installation

!macro customInstall
  ; Create data directory structure
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\ODX"
  CreateDirectory "$INSTDIR\data\ODX\bin"
  CreateDirectory "$INSTDIR\data\ODX\wads"
  CreateDirectory "$INSTDIR\data\ODX\config"
  
  DetailPrint "Created data directory at $INSTDIR\data"
!macroend

!macro customUnInstall
  ; Remove data directory if it exists (user may want to keep their data)
  ; Comment this out if we want to preserve user data on uninstall
  ; RMDir /r "$INSTDIR\data"
!macroend
