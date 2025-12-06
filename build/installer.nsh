; Custom NSIS script for ODX installer
; This creates a writable data directory next to the installation

!macro customInstall
  ; Create data directory structure
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\ODX"
  CreateDirectory "$INSTDIR\data\ODX\bin"
  CreateDirectory "$INSTDIR\data\ODX\wads"
  CreateDirectory "$INSTDIR\data\ODX\config"
  
  ; Set permissions so Users group can write to the data directory
  ; This allows the app to store Odamex files without requiring elevation
  AccessControl::GrantOnFile "$INSTDIR\data" "(BU)" "FullAccess"
  
  DetailPrint "Created writable data directory at $INSTDIR\data"
!macroend

!macro customUnInstall
  ; Remove data directory if it exists (user may want to keep their data)
  ; Comment this out if we want to preserve user data on uninstall
  ; RMDir /r "$INSTDIR\data"
!macroend
