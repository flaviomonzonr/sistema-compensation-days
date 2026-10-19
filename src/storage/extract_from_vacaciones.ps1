$datasetPath = "C:\apps-flavio\Sistema de Vacaciones\initial_dataset.json"
$excelPath = "C:\apps-flavio\Sistema de Vacaciones\PLANTILLA PARA VACIONES AGOSTO 2026.xlsx"
$outputPath = "C:\apps-flavio\sistema-compensation-days\src\storage\imported_employees.json"

Write-Host "Iniciando extraccion de trabajadores desde Sistema de Vacaciones..."

$employeesMap = @{}

if (Test-Path $datasetPath) {
    Write-Host "Leyendo dataset JSON..."
    $jsonRaw = [System.IO.File]::ReadAllText($datasetPath, [System.Text.Encoding]::UTF8)
    $data = $jsonRaw | ConvertFrom-Json
    
    $list = @()
    if ($data -is [System.Array]) {
        $list = $data
    } elseif ($data.PSObject.Properties['employees']) {
        $list = $data.employees
    } elseif ($data.PSObject.Properties['trabajadores']) {
        $list = $data.trabajadores
    } elseif ($data.PSObject.Properties['personal']) {
        $list = $data.personal
    } elseif ($data.PSObject.Properties['data']) {
        $list = $data.data
    } else {
        foreach ($prop in $data.PSObject.Properties) {
            if ($prop.Value -is [System.Array] -and $prop.Value.Count -gt 0) {
                $list = $prop.Value
                break
            }
        }
    }

    Write-Host "Encontrados $($list.Count) registros en dataset."
    foreach ($item in $list) {
        $codigo = "$($item.codigo)".Trim().ToUpper()
        if (-not $codigo) { $codigo = "$($item.CODIGO)".Trim().ToUpper() }
        if (-not $codigo) { $codigo = "$($item.id)".Trim().ToUpper() }
        
        $dni = "$($item.documentoIdentidad)".Trim()
        if (-not $dni) { $dni = "$($item.dni)".Trim() }
        if (-not $dni) { $dni = "$($item.DNI)".Trim() }
        if (-not $dni) { $dni = "$($item.DOCUMENTO)".Trim() }
        if (-not $dni) { $dni = "$($item.num_doc)".Trim() }

        $nombre = "$($item.apellidosNombres)".Trim().ToUpper()
        if (-not $nombre) { $nombre = "$($item.nombres)".Trim().ToUpper() }
        if (-not $nombre) { $nombre = "$($item.NOMBRE)".Trim().ToUpper() }
        if (-not $nombre) { $nombre = "$($item.nombresApellidos)".Trim().ToUpper() }
        if (-not $nombre) { $nombre = "$($item.trabajador)".Trim().ToUpper() }

        $area = "$($item.area)".Trim().ToUpper()
        if (-not $area) { $area = "$($item.AREA)".Trim().ToUpper() }
        if (-not $area) { $area = "$($item.departamento)".Trim().ToUpper() }
        if (-not $area) { $area = "GENERAL" }
        $area = $area -replace "ASEGESURAMIENTO", "ASEGURAMIENTO"

        $cargo = "$($item.cargo)".Trim().ToUpper()
        if (-not $cargo) { $cargo = "$($item.CARGO)".Trim().ToUpper() }
        if (-not $cargo) { $cargo = "$($item.puesto)".Trim().ToUpper() }
        if (-not $cargo) { $cargo = "EMPLEADO" }

        $tipo = "$($item.tipoTrabajador)".Trim().ToUpper()
        if (-not $tipo) { $tipo = "$($item.tipo)".Trim().ToUpper() }
        if (-not $tipo) { $tipo = "$($item.TIPO)".Trim().ToUpper() }
        if (-not $tipo) { $tipo = "EMPLEADO" }

        $categoria = "$($item.categoria)".Trim().ToUpper()
        if (-not $categoria) { $categoria = "$($item.CATEGORIA)".Trim().ToUpper() }

        $estado = "$($item.estado)".Trim().ToUpper()
        if ($estado -match "CESA" -or $estado -match "INACT") { $estado = "CESADO" } else { $estado = "ACTIVO" }

        $fIngreso = "$($item.fechaIngreso)".Trim()
        if (-not $fIngreso) { $fIngreso = "$($item.FECHA_INGRESO)".Trim() }
        if (-not $fIngreso) { $fIngreso = "$($item.fecha_ingreso)".Trim() }
        if (-not $fIngreso) { $fIngreso = "$($item.fec_ing)".Trim() }
        if (-not $fIngreso -or $fIngreso.Length -lt 8) { $fIngreso = "2026-01-01" }

        $key = if ($codigo) { $codigo } elseif ($dni) { $dni } else { $nombre }
        if ($key -and $nombre) {
            $employeesMap[$key] = [PSCustomObject]@{
                id = "emp-" + (if ($codigo) { $codigo.ToLower() } else { [System.Guid]::NewGuid().ToString().Substring(0,8) })
                codigo = if ($codigo) { $codigo } else { "EMP-" + $employeesMap.Count }
                apellidosNombres = $nombre
                documentoIdentidad = if ($dni) { $dni } else { "" }
                fechaIngreso = $fIngreso
                fechaCese = if ($estado -eq "CESADO") { "$($item.fechaCese)" } else { $null }
                fechasIngreso = @($fIngreso)
                tipoTrabajador = $tipo
                categoria = $categoria
                area = $area
                cargo = $cargo
                estado = $estado
                createdAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        }
    }
}

$resultList = @($employeesMap.Values)
Write-Host "Total trabajadores unicos extraidos: $($resultList.Count)"

$jsonOutput = $resultList | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outputPath, $jsonOutput, [System.Text.Encoding]::UTF8)
Write-Host "Archivo guardado exitosamente en: $outputPath"
