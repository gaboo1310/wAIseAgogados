const dotenv = require('dotenv');
const path = require('path');
const fs = require("fs");

// Ruta relativa a partir del directorio actual
const envPath = path.join(__dirname, '.env');

console.log(envPath);
console.log('Intentando cargar .env desde:', envPath);

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error al cargar el archivo .env:', result.error);
} else {
  console.log('Archivo .env cargado correctamente');
}

// Resto del código
const AWS = require("aws-sdk");

// Verificar que las variables de entorno estén definidas
console.log("Verificando credenciales:");
console.log("AWS_ACCESS_KEY_ID está definido:", !!process.env.AWS_ACCESS_KEY_ID);
console.log("AWS_SECRET_ACCESS_KEY está definido:", !!process.env.AWS_SECRET_ACCESS_KEY);
console.log("AWS_REGION está definido:", !!process.env.AWS_REGION);
console.log("S3_BUCKET está definido:", !!process.env.S3_BUCKET);

// Configuración de AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const bucketName = process.env.S3_BUCKET;

// Función para descargar un archivo
async function descargarArchivo(key) {
  try {
    console.log(`Descargando: ${key}`);
    
    // Descargar el archivo
    const fileData = await s3.getObject({
      Bucket: bucketName,
      Key: key
    }).promise();
    
    // Crear directorio de descarga si no existe
    const downloadDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }
    
    // Guardar el archivo localmente
    const fileName = key.split('/').pop();
    const localFilePath = path.join(downloadDir, fileName);
    fs.writeFileSync(localFilePath, fileData.Body);
    
    console.log(`✓ Archivo descargado exitosamente en: ${localFilePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Error al descargar ${key}:`, error.message);
    return false;
  }
}

async function verificarConexion() {
  if (!bucketName) {
    console.error("Error: S3_BUCKET no está definido en el archivo .env");
    return;
  }

  try {
    console.log(`Intentando conectar al bucket: ${bucketName}`);
    const response = await s3.listObjectsV2({ Bucket: bucketName }).promise();
    console.log("Conexión exitosa. Archivos en el bucket:");
    
    if (response.Contents && response.Contents.length > 0) {
      // Mostrar todos los archivos
      response.Contents.forEach(file => console.log(`- ${file.Key}`));
      
      // Filtrar solo los archivos TXT
      const archivosTxt = response.Contents.filter(file => 
        file.Key.toLowerCase().endsWith('.txt')
      );
      
      if (archivosTxt.length > 0) {
        console.log(`\nEncontrados ${archivosTxt.length} archivos TXT. Iniciando descarga...\n`);
        
        // Descargar todos los archivos TXT
        let descargados = 0;
        for (const archivo of archivosTxt) {
          const resultado = await descargarArchivo(archivo.Key);
          if (resultado) descargados++;
        }
        
        console.log(`\nProceso completado: ${descargados} de ${archivosTxt.length} archivos TXT descargados.`);
      } else {
        console.log("\nNo se encontraron archivos TXT en el bucket.");
      }
    } else {
      console.log("El bucket está vacío o no tienes permisos para listar su contenido.");
    }
  } catch (error) {
    console.error("Error al conectar con S3:", error);
    
    if (error.code === 'CredentialsError' || error.code === 'InvalidAccessKeyId') {
      console.error("Las credenciales de AWS no son válidas o han expirado.");
    } else if (error.code === 'NoSuchBucket') {
      console.error(`El bucket '${bucketName}' no existe.`);
    } else if (error.code === 'AccessDenied') {
      console.error("No tienes permisos suficientes para acceder a este bucket.");
    }
  }
}

verificarConexion();