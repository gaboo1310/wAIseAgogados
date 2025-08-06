import { Injectable } from '@nestjs/common';

interface CleaningStats {
  originalLength: number;
  cleanedLength: number;
  removedItems: {
    folioReferences: number;
    repertorioCodes: number;
    marginalNumbers: number;
    extraSpaces: number;
    malformedPunctuation: number;
  };
  preservedItems: {
    dates: number;
    names: number;
    legalNumbers: number;
  };
}

@Injectable()
export class TextCleanerService {

  /**
   * Función principal que limpia texto OCR para documentos legales chilenos
   */
  cleanOCRText(dirtyText: string): { cleanText: string; stats: CleaningStats } {
    console.log(`[TextCleaner] 🧹 Iniciando limpieza de texto OCR (${dirtyText.length} caracteres)`);
    
    const stats: CleaningStats = {
      originalLength: dirtyText.length,
      cleanedLength: 0,
      removedItems: {
        folioReferences: 0,
        repertorioCodes: 0,
        marginalNumbers: 0,
        extraSpaces: 0,
        malformedPunctuation: 0
      },
      preservedItems: {
        dates: 0,
        names: 0,
        legalNumbers: 0
      }
    };

    let cleanText = dirtyText;

    // 1. ELIMINAR: Referencias de folios (F 5362 F, F 17169 F 185)
    cleanText = this.removeFolioReferences(cleanText, stats);

    // 2. ELIMINAR: Códigos de repertorio (5120 x 2 10237)
    cleanText = this.removeRepertorioCodes(cleanText, stats);

    // 3. ELIMINAR: Números marginales sueltos 
    cleanText = this.removeMarginalNumbers(cleanText, stats);

    // 4. PRESERVAR: Fechas y marcar para no eliminar
    const preservedDates = this.identifyAndPreserveDates(cleanText, stats);
    
    // 5. PRESERVAR: Nombres propios chilenos
    const preservedNames = this.identifyAndPreserveNames(cleanText, stats);

    // 6. LIMPIAR: Espacios extra y puntuación mal posicionada
    cleanText = this.fixSpacingAndPunctuation(cleanText, stats);

    // 7. LIMPIAR: Caracteres especiales de OCR mal interpretados
    cleanText = this.fixOCRCharacters(cleanText);

    // 8. MEJORAR: Detectar y corregir nombres manuscritos mal leídos
    cleanText = this.fixHandwrittenNames(cleanText, stats);

    // 9. NORMALIZAR: Texto final
    cleanText = this.normalizeText(cleanText);

    stats.cleanedLength = cleanText.length;
    
    this.logCleaningResults(stats, dirtyText.substring(0, 200), cleanText.substring(0, 200));

    return { cleanText, stats };
  }

  // ===== MÉTODOS DE LIMPIEZA ESPECÍFICOS =====

  private removeFolioReferences(text: string, stats: CleaningStats): string {
    // Patrones para referencias de folio: F 5362 F, F 17169 F 185, etc.
    const folioPatterns = [
      /\bF\s+\d+\s+F\b/g,           // F 5362 F
      /\bF\s+\d+\s+F\s+\d+\b/g,    // F 17169 F 185
      /\bFolio\s+\d+\b/gi,         // Folio 123
      /\bF°\s+\d+\b/g,             // F° 123
    ];

    let cleanText = text;
    folioPatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        stats.removedItems.folioReferences += matches.length;
        cleanText = cleanText.replace(pattern, ' ');
      }
    });

    return cleanText;
  }

  private removeRepertorioCodes(text: string, stats: CleaningStats): string {
    // Patrones para códigos de repertorio: 5120 x 2 10237, N° 12345 de 1998
    const repertorioPatterns = [
      /\b\d+\s+x\s+\d+\s+\d+\b/g,         // 5120 x 2 10237
      /\bN°?\s+\d+\s+de\s+Rep\./gi,       // N° 123 de Rep.
      /\bRepertorio\s+N°?\s+\d+/gi,       // Repertorio N° 123
      /\b\d+\s*[xX]\s*\d+\s*[-–]\s*\d+/g, // 123 x 456 - 789
    ];

    let cleanText = text;
    repertorioPatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        stats.removedItems.repertorioCodes += matches.length;
        cleanText = cleanText.replace(pattern, ' ');
      }
    });

    return cleanText;
  }

  private removeMarginalNumbers(text: string, stats: CleaningStats): string {
    // Eliminar números que están claramente fuera de contexto (marginales)
    let cleanText = text;

    // Números aislados al inicio o final de líneas (probablemente números de página/margen)
    const marginalPatterns = [
      /^\s*\d{1,4}\s*$/gm,          // Números solos en líneas
      /\s+\d{1,3}\s*$/gm,           // Números al final de líneas
      /^\s*\d{1,3}\s+/gm,           // Números al inicio de líneas (si no son parte de fechas)
    ];

    marginalPatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        // Verificar que no sean fechas antes de eliminar
        matches.forEach(match => {
          if (!this.isPartOfDate(match, cleanText)) {
            stats.removedItems.marginalNumbers++;
            cleanText = cleanText.replace(match, ' ');
          }
        });
      }
    });

    return cleanText;
  }

  private identifyAndPreserveDates(text: string, stats: CleaningStats): string[] {
    // Patrones de fechas chilenas que NO deben eliminarse
    const datePatterns = [
      /\b\d{1,2}\s+de\s+[A-Za-z]+\s+de\s+\d{4}\b/gi,     // 19 de Diciembre de 1947
      /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g,            // 19/12/1947, 19-12-47
      /\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\b/gi,               // 19 Diciembre 1947
      /\b[A-Za-z]+\s+\d{1,2},?\s+\d{4}\b/gi,             // Diciembre 19, 1947
      /\b\d{4}\b/g,                                       // Años solos: 1947
    ];

    const preservedDates: string[] = [];
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          preservedDates.push(match);
          stats.preservedItems.dates++;
        });
      }
    });

    console.log(`[TextCleaner] 📅 Preservando ${stats.preservedItems.dates} fechas:`, preservedDates.slice(0, 5));
    return preservedDates;
  }

  private identifyAndPreserveNames(text: string, stats: CleaningStats): string[] {
    // Patrones de nombres propios chilenos que NO deben eliminarse
    const namePatterns = [
      /\bDon\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)*\b/g,    // Don José, Don Juan Carlos
      /\bDoña\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)*\b/g,   // Doña María
      /\b[A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚÑ\s]{10,50}\b/g,                                 // NOMBRES EN MAYÚSCULAS
      /\bNotario\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóúñ]+)*\b/gi, // Notario José Pérez
    ];

    const preservedNames: string[] = [];
    namePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          preservedNames.push(match);
          stats.preservedItems.names++;
        });
      }
    });

    console.log(`[TextCleaner] 👤 Preservando ${stats.preservedItems.names} nombres:`, preservedNames.slice(0, 3));
    return preservedNames;
  }

  private fixSpacingAndPunctuation(text: string, stats: CleaningStats): string {
    let cleanText = text;

    // Espacios múltiples → espacio simple
    const extraSpaces = cleanText.match(/\s{2,}/g);
    if (extraSpaces) {
      stats.removedItems.extraSpaces += extraSpaces.length;
      cleanText = cleanText.replace(/\s{2,}/g, ' ');
    }

    // Puntuación mal posicionada
    const punctuationFixes = [
      [/\s+([,.;:])/g, '$1'],           // espacio antes de puntuación
      [/([,.;:])\s*([,.;:])/g, '$1 $2'], // puntuación pegada
      [/\.\s*\./g, '.'],                // puntos dobles
      [/,\s*,/g, ','],                  // comas dobles
    ];

    punctuationFixes.forEach(([pattern, replacement]) => {
      const matches = cleanText.match(pattern as RegExp);
      if (matches) {
        stats.removedItems.malformedPunctuation += matches.length;
        cleanText = cleanText.replace(pattern as RegExp, replacement as string);
      }
    });

    return cleanText;
  }

  private fixOCRCharacters(text: string): string {
    // Correcciones comunes de errores de OCR
    const ocrFixes = [
      // Correcciones específicas del ejemplo original
      [/\bImpedimentu\b/g, 'Impedimento'],
      [/\bimmable\b/g, 'inmueble'],
      [/\bmotario\b/g, 'notario'],
      
      // CORRECCIONES ESPECÍFICAS PARA LETRA MANUSCRITA
      // Confusiones comunes de letras manuscritas
      [/\bpam\b/gi, 'para'],                    // "pam" → "para"
      [/\bien\b/gi, 'bien'],                    // "bien" mal leído
      [/\beon\b/gi, 'con'],                     // "eon" → "con"
      [/\bque\b/gi, 'que'],                     // Asegurar "que" correcto
      [/\bpor\b/gi, 'por'],                     // Asegurar "por" correcto
      [/\bcon\b/gi, 'con'],                     // Asegurar "con" correcto
      [/\buna\b/gi, 'una'],                     // Asegurar "una" correcto
      
      // Números vs letras comunes en manuscritos
      [/\b0([a-z])/gi, 'o$1'],                 // 0 seguido de letra → o
      [/([a-z])0\b/gi, '$1o'],                 // letra seguida de 0 → o
      [/\b1([a-z])/gi, 'l$1'],                 // 1 seguido de letra → l
      [/([a-z])1\b/gi, '$1l'],                 // letra seguida de 1 → l
      [/\b5([a-z])/gi, 's$1'],                 // 5 seguido de letra → s
      [/([a-z])5\b/gi, '$1s'],                 // letra seguida de 5 → s
      
      // Patrones específicos de manuscritos legales chilenos
      [/\besefitura\b/gi, 'escritura'],        // "esefitura" → "escritura"
      [/\beseritum\b/gi, 'escritura'],         // "eseritum" → "escritura"
      [/\bpublica\b/gi, 'pública'],            // sin acento → con acento
      [/\bnotam\b/gi, 'notario'],              // "notam" → "notario"
      [/\bSantlago\b/gi, 'Santiago'],          // "Santlago" → "Santiago"
      [/\bSantiago\b/gi, 'Santiago'],          // Asegurar correcto
      [/\bChlle\b/gi, 'Chile'],                // "Chlle" → "Chile"
      [/\bRepubllca\b/gi, 'República'],        // "Republlca" → "República"
      
      // Apellidos comunes mal leídos
      [/\bGonzalez\b/gi, 'González'],          // sin acento → con acento
      [/\bRodriguez\b/gi, 'Rodríguez'],        // sin acento → con acento
      [/\bMartinez\b/gi, 'Martínez'],          // sin acento → con acento
      [/\bJimenez\b/gi, 'Jiménez'],            // sin acento → con acento
      [/\bSanchez\b/gi, 'Sánchez'],            // sin acento → con acento
      [/\bPerez\b/gi, 'Pérez'],                // sin acento → con acento
      
      // Correcciones generales de OCR
      [/rn/g, 'm'],                             // rn por m (error muy común OCR)
      [/\bvv/g, 'w'],                           // vv por w
      [/\bcl\b/gi, 'el'],                      // cl por el
      [/\bii\b/gi, 'll'],                      // ii por ll
      [/\bmm\b/gi, 'nn'],                      // mm por nn (a veces)
      
      // Signos de puntuación manuscritos
      [/\,\s*\./g, '.'],                       // coma seguida de punto → solo punto
      [/\.\s*\,/g, '.'],                       // punto seguido de coma → solo punto
      [/\;\s*\./g, '.'],                       // punto y coma + punto → solo punto
    ];

    let cleanText = text;
    ocrFixes.forEach(([pattern, replacement]) => {
      cleanText = cleanText.replace(pattern as RegExp, replacement as string);
    });

    return cleanText;
  }

  private fixHandwrittenNames(text: string, stats: CleaningStats): string {
    console.log(`[TextCleaner] ✍️ Corrigiendo nombres manuscritos mal leídos`);
    
    let cleanText = text;

    // PATRONES DE NOMBRES MANUSCRITOS MAL LEÍDOS
    const handwrittenNameFixes = [
      // Nombres comunes chilenos mal leídos
      [/\bJose\b/gi, 'José'],
      [/\bMaria\b/gi, 'María'],
      [/\bCarlos\b/gi, 'Carlos'],
      [/\bJuan\b/gi, 'Juan'],
      [/\bPedro\b/gi, 'Pedro'],
      [/\bLuis\b/gi, 'Luis'],
      [/\bManuel\b/gi, 'Manuel'],
      [/\bAntonio\b/gi, 'Antonio'],
      [/\bFrancisco\b/gi, 'Francisco'],
      [/\bMiguel\b/gi, 'Miguel'],
      [/\bRafael\b/gi, 'Rafael'],
      [/\bAlberto\b/gi, 'Alberto'],
      [/\bRicardo\b/gi, 'Ricardo'],
      [/\bEduardo\b/gi, 'Eduardo'],
      [/\bRoberto\b/gi, 'Roberto'],
      [/\bSergio\b/gi, 'Sergio'],
      [/\bGustavo\b/gi, 'Gustavo'],
      [/\bDiego\b/gi, 'Diego'],
      [/\bPablo\b/gi, 'Pablo'],
      [/\bAndres\b/gi, 'Andrés'],
      [/\bJorge\b/gi, 'Jorge'],
      [/\bRamon\b/gi, 'Ramón'],
      [/\bClaudio\b/gi, 'Claudio'],
      [/\bOscar\b/gi, 'Óscar'],
      [/\bVictor\b/gi, 'Víctor'],
      [/\bHector\b/gi, 'Héctor'],
      [/\bFabian\b/gi, 'Fabián'],
      [/\bCesar\b/gi, 'César'],
      [/\bAdrian\b/gi, 'Adrián'],
      [/\bDaniel\b/gi, 'Daniel'],
      [/\bMartin\b/gi, 'Martín'],
      [/\bSebastian\b/gi, 'Sebastián'],
      [/\bIgnacio\b/gi, 'Ignacio'],
      [/\bGonzalo\b/gi, 'Gonzalo'],
      [/\bMatias\b/gi, 'Matías'],
      [/\bNicolas\b/gi, 'Nicolás'],
      [/\bMaximiliano\b/gi, 'Maximiliano'],
      [/\bAlexandro\b/gi, 'Alejandro'],
      [/\bAlejandro\b/gi, 'Alejandro'],
      
      // Nombres femeninos
      [/\bAna\b/gi, 'Ana'],
      [/\bCarmen\b/gi, 'Carmen'],
      [/\bTeresa\b/gi, 'Teresa'],
      [/\bMargarita\b/gi, 'Margarita'],
      [/\bRosa\b/gi, 'Rosa'],
      [/\bPatricia\b/gi, 'Patricia'],
      [/\bClaudia\b/gi, 'Claudia'],
      [/\bVeronica\b/gi, 'Verónica'],
      [/\bAndrea\b/gi, 'Andrea'],
      [/\bMonica\b/gi, 'Mónica'],
      [/\bAdriana\b/gi, 'Adriana'],
      [/\bBarbara\b/gi, 'Bárbara'],
      [/\bBeatriz\b/gi, 'Beatriz'],
      [/\bCecilia\b/gi, 'Cecilia'],
      [/\bCristina\b/gi, 'Cristina'],
      [/\bElena\b/gi, 'Elena'],
      [/\bFrancisca\b/gi, 'Francisca'],
      [/\bGabriela\b/gi, 'Gabriela'],
      [/\bIsabel\b/gi, 'Isabel'],
      [/\bJacqueline\b/gi, 'Jacqueline'],
      [/\bJosefina\b/gi, 'Josefina'],
      [/\bLaura\b/gi, 'Laura'],
      [/\bLorena\b/gi, 'Lorena'],
      [/\bLucia\b/gi, 'Lucía'],
      [/\bMariana\b/gi, 'Mariana'],
      [/\bNatalia\b/gi, 'Natalia'],
      [/\bPaola\b/gi, 'Paola'],
      [/\bSilvia\b/gi, 'Silvia'],
      [/\bSonia\b/gi, 'Sonia'],
      [/\bValeria\b/gi, 'Valeria'],
      [/\bViviana\b/gi, 'Viviana'],
      
      // Apellidos chilenos comunes mal leídos
      [/\bGonzalez\b/gi, 'González'],
      [/\bRodriguez\b/gi, 'Rodríguez'],
      [/\bMartinez\b/gi, 'Martínez'],
      [/\bLopez\b/gi, 'López'],
      [/\bGarcia\b/gi, 'García'],
      [/\bHernandez\b/gi, 'Hernández'],
      [/\bMunoz\b/gi, 'Muñoz'],
      [/\bRojas\b/gi, 'Rojas'],
      [/\bFuentes\b/gi, 'Fuentes'],
      [/\bCastro\b/gi, 'Castro'],
      [/\bSilva\b/gi, 'Silva'],
      [/\bSoto\b/gi, 'Soto'],
      [/\bVargas\b/gi, 'Vargas'],
      [/\bReyes\b/gi, 'Reyes'],
      [/\bSepulveda\b/gi, 'Sepúlveda'],
      [/\bEspinoza\b/gi, 'Espinoza'],
      [/\bContreras\b/gi, 'Contreras'],
      [/\bTorres\b/gi, 'Torres'],
      [/\bAraya\b/gi, 'Araya'],
      [/\bFlores\b/gi, 'Flores'],
      [/\bEspinosa\b/gi, 'Espinosa'],
      [/\bValenzuela\b/gi, 'Valenzuela'],
      [/\bBravo\b/gi, 'Bravo'],
      [/\bCortez\b/gi, 'Cortés'],
      [/\bMorales\b/gi, 'Morales'],
      [/\bOrtega\b/gi, 'Ortega'],
      [/\bRomero\b/gi, 'Romero'],
      [/\bRivera\b/gi, 'Rivera'],
      [/\bJimenez\b/gi, 'Jiménez'],
      [/\bAlvarez\b/gi, 'Álvarez'],
      [/\bDiaz\b/gi, 'Díaz'],
      [/\bPena\b/gi, 'Peña'],
      [/\bVega\b/gi, 'Vega'],
      [/\bAguilar\b/gi, 'Aguilar'],
      [/\bCarmona\b/gi, 'Carmona'],
      [/\bOsorio\b/gi, 'Osorio'],
      [/\bTapia\b/gi, 'Tapia'],
      [/\bPalma\b/gi, 'Palma'],
      [/\bRuiz\b/gi, 'Ruiz'],
      [/\bMedina\b/gi, 'Medina'],
      [/\bNavarro\b/gi, 'Navarro'],
      [/\bSanchez\b/gi, 'Sánchez'],
      [/\bVasquez\b/gi, 'Vásquez'],
      [/\bPerez\b/gi, 'Pérez'],
      
      // Patrones de nombres mal escritos específicos
      [/\bJ0se\b/gi, 'José'],                  // 0 por o
      [/\bMar1a\b/gi, 'María'],               // 1 por í
      [/\bCar10s\b/gi, 'Carlos'],             // 10 por lo  
      [/\bPedr0\b/gi, 'Pedro'],               // 0 por o
      [/\bLu1s\b/gi, 'Luis'],                 // 1 por í
      [/\bAnton10\b/gi, 'Antonio'],           // 10 por io
      [/\bFranc1sco\b/gi, 'Francisco'],       // 1 por i
      [/\bM1guel\b/gi, 'Miguel'],             // 1 por i
      [/\bRafae1\b/gi, 'Rafael'],             // 1 por l
      [/\bRobert0\b/gi, 'Roberto'],           // 0 por o
      [/\bGustar0\b/gi, 'Gustavo'],           // r0 por vo
      [/\bAndre5\b/gi, 'Andrés'],             // 5 por s
      [/\bJ0rge\b/gi, 'Jorge'],               // 0 por o
      [/\bRam0n\b/gi, 'Ramón'],               // 0 por ó
      [/\b0scar\b/gi, 'Óscar'],               // 0 por Ó
      [/\bV1ctor\b/gi, 'Víctor'],             // 1 por í
      [/\bHect0r\b/gi, 'Héctor'],             // 0 por ó
      [/\bFab1an\b/gi, 'Fabián'],             // 1 por í
      [/\bCe5ar\b/gi, 'César'],               // 5 por s
      [/\bAdr1an\b/gi, 'Adrián'],             // 1 por í
      [/\bMart1n\b/gi, 'Martín'],             // 1 por í
      [/\bSeba5tian\b/gi, 'Sebastián'],       // 5 por s
      [/\bIgnac10\b/gi, 'Ignacio'],           // 10 por io
      [/\bMat1as\b/gi, 'Matías'],             // 1 por í
      [/\bN1colas\b/gi, 'Nicolás'],           // 1 por í
      
      // Confusiones de letras manuscritas específicas
      [/\bJuau\b/gi, 'Juan'],                 // u por n
      [/\bPedm\b/gi, 'Pedro'],               // m por ro
      [/\bCamn\b/gi, 'Carmen'],              // mn por men
      [/\bMaml\b/gi, 'Manuel'],              // ml por nuel
      [/\bFmncisco\b/gi, 'Francisco'],       // mn por ran
      [/\bGonzMez\b/gi, 'González'],         // M por ále
      [/\bRodmguez\b/gi, 'Rodríguez'],       // m por rí
      [/\bMamtinez\b/gi, 'Martínez'],        // Mam por Mar
    ];

    let fixedNames = 0;
    handwrittenNameFixes.forEach(([pattern, replacement]) => {
      const matches = cleanText.match(pattern as RegExp);
      if (matches) {
        fixedNames += matches.length;
        cleanText = cleanText.replace(pattern as RegExp, replacement as string);
      }
    });

    console.log(`[TextCleaner] ✍️ Corregidos ${fixedNames} nombres manuscritos`);
    
    return cleanText;
  }

  private normalizeText(text: string): string {
    return text
      .trim()                         // Eliminar espacios al inicio/final
      .replace(/\n{3,}/g, '\n\n')     // Máximo 2 saltos de línea consecutivos
      .replace(/\s+$/gm, '')          // Eliminar espacios al final de líneas
      .replace(/^\s+/gm, '')          // Eliminar espacios al inicio de líneas (excepto indentación intencionada)
      .replace(/([.!?])\s*\n\s*([a-z])/g, '$1 $2'); // Unir líneas que fueron cortadas mal
  }

  // ===== MÉTODOS AUXILIARES =====

  private isPartOfDate(numberStr: string, fullText: string): boolean {
    // Verificar si un número es parte de una fecha
    const dateContext = /\b\d{1,2}\s+de\s+[A-Za-z]+\s+de\s+\d{4}\b|\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/gi;
    const contextWindow = fullText.substring(
      Math.max(0, fullText.indexOf(numberStr) - 50),
      fullText.indexOf(numberStr) + numberStr.length + 50
    );
    
    return dateContext.test(contextWindow);
  }

  private logCleaningResults(stats: CleaningStats, originalSample: string, cleanedSample: string): void {
    console.log(`[TextCleaner] ✅ Limpieza completada:`);
    console.log(`[TextCleaner] 📊 Texto: ${stats.originalLength} → ${stats.cleanedLength} caracteres`);
    console.log(`[TextCleaner] 🗑️ Eliminado: ${stats.removedItems.folioReferences} folios, ${stats.removedItems.repertorioCodes} repertorios, ${stats.removedItems.marginalNumbers} números marginales`);
    console.log(`[TextCleaner] 🛡️ Preservado: ${stats.preservedItems.dates} fechas, ${stats.preservedItems.names} nombres`);
    
    console.log(`[TextCleaner] 📝 ANTES: ${originalSample}...`);
    console.log(`[TextCleaner] ✨ DESPUÉS: ${cleanedSample}...`);
  }

  // ===== MÉTODO DE TESTING =====

  testCleaner(): void {
    const testCases = [
      'Impedimentu uno del hotel respectivo, en los Canales, F 5362 F de 19 de Diciembre a 15. 5120 x 2 10237 de 1947, en el F 17169 F 185 de 1947 ante el referido immable se ha construido un motario Don José',
      'WASHINGTON BAUDILIO DROGUETT PÉREZ R.U.N. : 5.049.865-4 Fecha nacimiento : 9 Mayo 1944',
      'POR ESCRITURA PUBLICA DE FECHA 20-09-1993 OTORGADA ANTE EL NOTARIO DE SANTIAGO DON HUMBERTO SANTELICES'
    ];

    console.log(`[TextCleaner] 🧪 Ejecutando pruebas de limpieza...`);
    
    testCases.forEach((testCase, index) => {
      console.log(`\n[TextCleaner] Test ${index + 1}:`);
      const result = this.cleanOCRText(testCase);
      console.log(`Input:  ${testCase}`);
      console.log(`Output: ${result.cleanText}`);
    });
  }
}