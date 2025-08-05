import { ProjectInfo } from './types';

// Función para normalizar títulos
export function normalizeTitle(title: string | undefined | null): string {
  if (!title) return 'Sin título';
  
  // Eliminar caracteres especiales y espacios extra
  let normalized = title.trim()
    .replace(/[^\w\s\u00C0-\u00FF]/g, '') // Mantener letras, números, espacios y caracteres acentuados
    .replace(/\s+/g, ' '); // Reemplazar múltiples espacios por uno solo
  
  // Capitalizar primera letra de cada palabra
  normalized = normalized.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return normalized || 'Sin título';
}

// Función para normalizar fechas
export function normalizeDate(date: string | undefined | null): string {
  if (!date) return 'Sin fecha';
  
  // Intentar diferentes formatos de fecha
  const dateFormats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    /(\d{1,2})\s+de\s+([a-zA-Z]+)\s+de\s+(\d{4})/ // DD de MES de YYYY
  ];
  
  for (const format of dateFormats) {
    const match = date.match(format);
    if (match) {
      // Convertir a formato estándar YYYY-MM-DD
      if (format === dateFormats[0] || format === dateFormats[2]) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      } else if (format === dateFormats[1]) {
        return date; // Ya está en formato correcto
      } else if (format === dateFormats[3]) {
        const months: { [key: string]: string } = {
          'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
          'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
          'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
        };
        const month = months[match[2].toLowerCase()];
        if (month) {
          return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
        }
      }
    }
  }
  
  return 'Sin fecha';
}

// Función para normalizar URLs
export function normalizeUrl(url: string | undefined | null): string {
  if (!url) return 'Sin URL';

  // Extraer todas las URLs válidas usando regex
  const urls = url.match(/https?:\/\/[^\s)]+/g);
  if (urls && urls.length > 0) {
    // Si la primera URL es seguida inmediatamente por un paréntesis con la misma URL, solo devuelve la primera
    if (urls.length > 1 && urls[0] === urls[1]) {
      return urls[0];
    }
    return urls[0];
  }

  // Si no hay coincidencia, limpiar y asegurar el formato
  let cleanUrl = url.split(' ')[0].split('(')[0].split(')')[0];
  cleanUrl = cleanUrl.trim().replace(/\s+/g, '');
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  return cleanUrl || 'Sin URL';
}

// Función para normalizar texto
export function normalizeText(text: string | undefined | null): string {
  if (!text) return 'Sin texto';
  
  // Eliminar caracteres especiales y espacios extra
  let normalized = text.trim()
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
    .replace(/[\r\n]+/g, ' '); // Reemplazar saltos de línea por espacios
  
  return normalized || 'Sin texto';
}

// Función principal para normalizar todos los metadatos de un proyecto
export function normalizeProjectMetadata(project: ProjectInfo): ProjectInfo {
  return {
    ...project,
    title: normalizeTitle(project.title),
    projectDate: normalizeDate(project.projectDate),
    url: normalizeUrl(project.url),
    text: normalizeText(project.text)
  };
}

// Función para normalizar un array de proyectos
export function normalizeProjectsMetadata(projects: ProjectInfo[]): ProjectInfo[] {
  return projects.map(normalizeProjectMetadata);
} 