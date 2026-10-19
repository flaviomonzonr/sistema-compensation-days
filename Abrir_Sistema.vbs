Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Directorio base del proyecto
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = appDir

' 1. Verificar si el servidor ya está activo en http://localhost:5175
Dim http
serverReady = False

On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
If http Is Nothing Then
    Set http = CreateObject("MSXML2.ServerXMLHTTP")
End If

If Not http Is Nothing Then
    http.setTimeouts 500, 500, 500, 500
    http.open "GET", "http://localhost:5175/", False
    http.send
    If Err.Number = 0 Then
        If http.Status = 200 Or http.Status = 304 Then
            serverReady = True
        End If
    End If
    Err.Clear
End If
On Error GoTo 0

' 2. Si no está corriendo, iniciarlo 100% oculto en segundo plano (0 = Hidden, sin ventana de consola)
If Not serverReady Then
    Dim batPath
    batPath = appDir & "\iniciar_silencioso.bat"
    WshShell.Run "cmd.exe /c """ & batPath & """", 0, False
    
    ' Esperar hasta que Vite responda en el puerto 5175 (hasta 8 segundos)
    Dim i
    For i = 1 To 24
        WScript.Sleep 300
        On Error Resume Next
        Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
        If http Is Nothing Then Set http = CreateObject("MSXML2.ServerXMLHTTP")
        http.setTimeouts 300, 300, 300, 300
        http.open "GET", "http://localhost:5175/", False
        http.send
        If Err.Number = 0 Then
            If http.Status = 200 Or http.Status = 304 Then
                serverReady = True
                Exit For
            End If
        End If
        Err.Clear
        On Error GoTo 0
    Next
End If

' 3. Abrir la aplicación en el navegador web predeterminado
WshShell.Run "http://localhost:5175/"
