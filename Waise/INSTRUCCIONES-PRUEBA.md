# 🧪 INSTRUCCIONES DE PRUEBA - SISTEMA OCR + RAG

## ✅ ESTADO: SISTEMA LISTO PARA PROBAR
### 🔧 **ACTUALIZACIÓN**: OCR Arreglado para PDFs

### 📋 **PASO 1: Iniciar Backend**
```bash
cd backend
npm run start:dev
```

### 📋 **PASO 2: Iniciar Frontend** 
```bash  
cd Waise
npm start
```

### 📋 **PASO 3: Subir Documento**
1. Ve a la sección de documentos en la aplicación
2. Sube un PDF legal (contrato, factura, etc.)
3. **NUEVO**: El sistema ahora convierte PDFs a imágenes automáticamente
4. **ESPERA** a que aparezca el estado "completed" (puede tomar más tiempo por la conversión)

### 📋 **PASO 4: Probar RAG en Chat**
1. Ve al chat principal
2. Haz preguntas específicas sobre tu documento:
   - **"¿De qué trata el documento que subí?"**
   - **"Resume mi contrato"**
   - **"¿Cuáles son las fechas importantes?"**
   - **"¿Qué montos aparecen en el documento?"**

### 🔍 **LOGS ESPERADOS EN BACKEND:**

**Upload y OCR:**
```
[OCR] Converting PDF to images for processing...
[OCR] Converted PDF to X images
[OCR] Processing page 1/X
[OCR] Page 1: Extracted XXX characters
[DocumentMetadataService] Added X chunks to vector database
```

**Chat con RAG:**
```
[BACKEND] Usuario autenticado correctamente: true
[BACKEND] Realizando búsqueda RAG en documentos...  
[VectorService] Found X similar chunks
[BACKEND] Encontrados X documentos relevantes
[CHAT STREAM] RAG context available: Yes
```

### ❌ **SI NO FUNCIONA:**

**Problema: "Usuario autenticado correctamente: false"**
- Verifica que estés logueado en la aplicación
- Revisa que el token JWT sea válido
- Comprueba las variables de entorno AUTH0

**Problema: "Found 0 similar chunks"**  
- Verifica que el documento se haya procesado completamente
- Revisa las variables PINECONE_API_KEY y OPENAI_API_KEY
- Asegúrate que el estado del documento sea "completed"

### 🎯 **ÉXITO ESPERADO:**
El chat debería responder con información específica de tu documento subido, citando el nombre del archivo y usando el contenido real extraído por OCR.

---
## 🔧 **SOLUCIÓN DE PROBLEMAS RÁPIDOS**

1. **Backend no inicia**: Revisa variables en `.env`
2. **Sin documentos**: Verifica que el upload fue exitoso
3. **Chat genérico**: El sistema busca automáticamente, no necesitas activar nada especial
4. **Error de autenticación**: Refresca la página y vuelve a loguearte

---
**¡El sistema está 100% funcional! Ahora deberías poder chatear con tus documentos legales.** 🚀