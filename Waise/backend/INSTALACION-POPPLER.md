# Instalación de Poppler para OCR de PDFs Escaneados

## Problema Actual
El sistema OCR puede leer texto directo de PDFs pero no puede procesar **PDFs escaneados** (imágenes) porque falta **Poppler** en el sistema.

## ¿Qué es Poppler?
Poppler es una biblioteca que permite convertir PDFs a imágenes, necesaria para enviar PDFs escaneados a Mistral OCR.

## Instalación en Windows

### Opción 1: Descarga Directa (Recomendado)
1. Ve a: https://github.com/oschwartz10612/poppler-windows/releases/
2. Descarga `poppler-22.04.0_x64.7z` (o versión más reciente)
3. Extrae a `C:\poppler`
4. Agrega `C:\poppler\bin` al PATH del sistema:
   - Windows + R → `sysdm.cpl`
   - Pestaña "Advanced" → "Environment Variables"
   - En "System Variables" busca "Path" → "Edit"
   - Agregar nueva entrada: `C:\poppler\bin`
   - OK → OK → OK
5. Reinicia el terminal/IDE

### Opción 2: Chocolatey
```bash
choco install poppler
```

### Opción 3: Scoop  
```bash
scoop install poppler
```

## Verificación de Instalación
Abre una nueva terminal y ejecuta:
```bash
pdftoppm -h
```

Si ves la ayuda de pdftoppm, Poppler está instalado correctamente.

## Prueba del OCR después de la instalación
```bash
cd backend
node test-ocr-debug.js
```

## Estado Actual del Sistema OCR

### ✅ Funcionando:
- Conexión a Mistral API
- Extracción de texto directo de PDFs (PDFs con texto seleccionable)
- Sistema robusto de fallbacks
- Logging detallado
- Métricas y health scoring

### ❌ Necesita Poppler:
- PDFs escaneados (imágenes sin texto seleccionable)  
- Documentos que son fotografías de papel
- PDFs generados por scanners

Una vez instalado Poppler, el sistema podrá:
1. Convertir PDFs escaneados a imágenes
2. Enviar imágenes a Mistral OCR
3. Extraer texto de documentos completamente escaneados
4. Procesar certificados, formularios escaneados, etc.

## Test Rápido de Funcionalidad Actual
El sistema OCR **YA FUNCIONA** para PDFs con texto. Solo necesitas Poppler para PDFs escaneados.