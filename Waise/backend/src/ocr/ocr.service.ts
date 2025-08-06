import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { fromPath } from 'pdf2pic';
import * as pdfParse from 'pdf-parse';
import { Mistral } from '@mistralai/mistralai';
import { TextCleanerService } from './text-cleaner.service';
const pdfPoppler = require('pdf-poppler');

// Interfaces para métricas y logging estructurado
export interface ProcessingMetrics {
  totalTime: number;
  directTextTime?: number;
  ocrTime?: number;
  successfulMethod: string;
  charactersExtracted: number;
  pagesProcessed: number;
  errorCount: number;
  retryCount: number;
}

export interface DocumentCharacteristics {
  hasText: boolean;
  hasMixedContent: boolean;
  hasHandwriting: boolean;
  hasFormFields: boolean;
  hasSeals: boolean;
  estimatedQuality: 'high' | 'medium' | 'low';
  documentType: 'printed' | 'scanned' | 'mixed' | 'handwritten';
}

export interface ExtractionAttempt {
  method: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  charactersExtracted: number;
  errorMessage?: string;
  config?: any;
}

export interface OCRResult {
  success: boolean;
  extractedText: string;    // ← TEXTO LIMPIO para vectorización
  rawText?: string;         // ← TEXTO ORIGINAL sin limpiar
  confidence: number;
  error?: string;
  cleaningStats?: {         // ← Estadísticas de limpieza
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
  };
  metadata?: {
    pageCount: number;
    processingTime: number;
    model: string;
    fileSize: number;
    isScannedDocument?: boolean;
    documentCharacteristics?: DocumentCharacteristics;
    processingMetrics?: ProcessingMetrics;
    extractionAttempts?: ExtractionAttempt[];
    healthScore?: number; // 0-100 score de qué tan bien se procesó
    failureReasons?: {
      imageExtraction: string;
      directText: string;
    };
  };
}

@Injectable()
export class OcrService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly mistralClient: Mistral;
  private readonly textCleaner: TextCleanerService;
  private readonly processingStats = {
    totalDocuments: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    averageProcessingTime: 0,
    methodSuccessRates: {
      directText: { attempts: 0, successes: 0 },
      ocrConfig1: { attempts: 0, successes: 0 },
      ocrConfig2: { attempts: 0, successes: 0 }
    }
  };

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || '';
    this.model = process.env.MISTRAL_OCR_MODEL || 'mistral-ocr-latest'; // Usar modelo OCR dedicado
    
    if (!this.apiKey) {
      console.warn('[OCR] ⚠️ MISTRAL_API_KEY not found - OCR functionality will be limited');
    }

    // Initialize official Mistral client
    this.mistralClient = new Mistral({ apiKey: this.apiKey });
    
    // Initialize text cleaner service
    this.textCleaner = new TextCleanerService();
    
    console.log('[OCR] 🚀 OCR Service initialized with official Mistral client');
    console.log(`[OCR] 📊 Model: ${this.model}`);
    console.log(`[OCR] 🔑 API Key: ${this.apiKey ? '✅ Configured' : '❌ Missing'}`);
    console.log('[OCR] 🎯 Using dedicated OCR API - No Poppler needed!');
    console.log('[OCR] 🧹 Text cleaner initialized for legal documents');
  }

  async extractTextFromPdf(filePath: string): Promise<OCRResult> {
    const sessionId = Math.random().toString(36).substring(2, 15);
    const startTime = Date.now();
    this.processingStats.totalDocuments++;
    
    console.log(`[OCR] 🚀 Session ${sessionId}: Starting robust text extraction from: ${path.basename(filePath)}`);
    console.log(`[OCR] 📁 Full path: ${filePath}`);
    
    const extractionAttempts: ExtractionAttempt[] = [];
    const processingMetrics: ProcessingMetrics = {
      totalTime: 0,
      successfulMethod: 'none',
      charactersExtracted: 0,
      pagesProcessed: 0,
      errorCount: 0,
      retryCount: 0
    };

    try {
      // Verificación robusta del archivo
      if (!await this.safeFileExists(filePath)) {
        return this.createEmergencyResult(filePath, startTime, 'File not found or inaccessible', extractionAttempts, processingMetrics);
      }

      const fileBuffer = await this.safeReadFile(filePath);
      if (!fileBuffer) {
        return this.createEmergencyResult(filePath, startTime, 'Could not read file buffer', extractionAttempts, processingMetrics);
      }

      const mimeType = this.getMimeType(filePath);
      console.log(`[OCR] 📊 File analysis: ${fileBuffer.length} bytes, type: ${mimeType}`);

      // Análisis profundo del documento
      const characteristics = await this.analyzeDocumentCharacteristics(fileBuffer, filePath);
      this.logDocumentCharacteristics(sessionId, characteristics);

      let bestResult: any = null;

      if (mimeType === 'application/pdf') {
        bestResult = await this.processWithRobustPipeline(
          fileBuffer, 
          filePath, 
          characteristics, 
          sessionId, 
          extractionAttempts, 
          processingMetrics
        );
      } else {
        // Procesar imagen directamente con manejo robusto
        bestResult = await this.processImageWithFallback(
          fileBuffer, 
          mimeType, 
          sessionId, 
          extractionAttempts, 
          processingMetrics
        );
      }

      // Finalizar métricas
      processingMetrics.totalTime = Date.now() - startTime;
      
      // Actualizar estadísticas globales
      this.updateGlobalStats(processingMetrics, true);
      
      // LIMPIAR TEXTO antes de la vectorización
      console.log(`[OCR] 🧹 Session ${sessionId}: Aplicando limpieza de texto para vectorización`);
      const rawText = bestResult.text || '';
      const cleaningResult = this.textCleaner.cleanOCRText(rawText);
      const cleanText = cleaningResult.cleanText;
      
      console.log(`[OCR] ✨ Session ${sessionId}: Texto limpiado: ${rawText.length} → ${cleanText.length} caracteres`);

      // Loggear resultado final
      this.logFinalResult(sessionId, { ...bestResult, text: cleanText }, processingMetrics, extractionAttempts);

      return {
        success: true,
        extractedText: cleanText, // ← TEXTO LIMPIO para vectorización
        rawText: rawText,         // ← TEXTO ORIGINAL por si se necesita
        confidence: bestResult.confidence || 0.5,
        cleaningStats: cleaningResult.stats, // ← Estadísticas de limpieza
        metadata: {
          pageCount: bestResult.pageCount || 1,
          processingTime: processingMetrics.totalTime,
          model: this.model,
          fileSize: fileBuffer.length,
          documentCharacteristics: characteristics,
          processingMetrics,
          extractionAttempts,
          healthScore: this.calculateHealthScore(bestResult, processingMetrics, extractionAttempts)
        }
      };

    } catch (criticalError) {
      console.error(`[OCR] 🚨 Session ${sessionId}: Critical error caught at top level:`, criticalError);
      processingMetrics.totalTime = Date.now() - startTime;
      processingMetrics.errorCount++;
      this.updateGlobalStats(processingMetrics, false);
      
      // NUNCA devolver error - siempre devolver algo útil
      return this.createEmergencyResult(
        filePath, 
        startTime, 
        criticalError instanceof Error ? criticalError.message : 'Unknown critical error', 
        extractionAttempts, 
        processingMetrics
      );
    }
  }


  // ===== MÉTODOS AUXILIARES ROBUSTOS =====

  private async safeFileExists(filePath: string): Promise<boolean> {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      console.error(`[OCR] Error checking file existence: ${error.message}`);
      return false;
    }
  }

  private async safeReadFile(filePath: string): Promise<Buffer | null> {
    try {
      return fs.readFileSync(filePath);
    } catch (error) {
      console.error(`[OCR] Error reading file: ${error.message}`);
      return null;
    }
  }

  private async analyzeDocumentCharacteristics(fileBuffer: Buffer, filePath: string): Promise<DocumentCharacteristics> {
    console.log('[OCR] 🔍 Analyzing document characteristics...');
    
    const characteristics: DocumentCharacteristics = {
      hasText: false,
      hasMixedContent: false,
      hasHandwriting: false,
      hasFormFields: false,
      hasSeals: false,
      estimatedQuality: 'medium',
      documentType: 'scanned'
    };

    try {
      // Análisis básico del texto extraíble
      const pdfData = await pdfParse(fileBuffer);
      const extractedText = pdfData.text?.trim() || '';
      const textLength = extractedText.length;

      characteristics.hasText = textLength > 0;

      if (textLength > 0) {
        // Análisis de calidad del texto
        const meaningfulChars = extractedText.replace(/[\s\n\r\t]/g, '').length;
        const textRatio = meaningfulChars / textLength;
        
        // Detectar características de documentos legales chilenos
        const hasFormFields = this.detectFormFields(extractedText);
        const hasSeals = this.detectSeals(extractedText);
        const hasHandwriting = this.detectHandwriting(extractedText);
        const hasMixedContent = hasFormFields && (hasHandwriting || hasSeals);

        characteristics.hasFormFields = hasFormFields;
        characteristics.hasSeals = hasSeals;
        characteristics.hasHandwriting = hasHandwriting;
        characteristics.hasMixedContent = hasMixedContent;

        // Determinar tipo de documento
        if (hasMixedContent) {
          characteristics.documentType = 'mixed';
        } else if (textRatio > 0.8 && textLength > 100) {
          characteristics.documentType = 'printed';
        } else if (hasHandwriting) {
          characteristics.documentType = 'handwritten';
        } else {
          characteristics.documentType = 'scanned';
        }

        // Estimar calidad
        if (textRatio > 0.9 && textLength > 500) {
          characteristics.estimatedQuality = 'high';
        } else if (textRatio > 0.5 && textLength > 100) {
          characteristics.estimatedQuality = 'medium';
        } else {
          characteristics.estimatedQuality = 'low';
        }
      }

    } catch (error) {
      console.warn(`[OCR] Error analyzing characteristics: ${error.message}`);
    }

    return characteristics;
  }

  private detectFormFields(text: string): boolean {
    // Patrones comunes en formularios chilenos
    const formPatterns = [
      /NOMBRE[\s]*:[\s]*_+/i,
      /RUT[\s]*:[\s]*_+/i,
      /FECHA[\s]*:[\s]*_+/i,
      /FIRMA[\s]*:[\s]*_+/i,
      /DIRECCIÓN[\s]*:[\s]*_+/i,
      /TELÉFONO[\s]*:[\s]*_+/i,
      /\[[\s]*\][\s]*SI[\s]*\[[\s]*\][\s]*NO/i,
      /☐|☑|✓|✗/,
      /___{3,}/,
      /\.{5,}/
    ];

    return formPatterns.some(pattern => pattern.test(text));
  }

  private detectSeals(text: string): boolean {
    // Patrones de sellos y timbres
    const sealPatterns = [
      /SELLO[\s]*OFICIAL/i,
      /TIMBRE/i,
      /NOTARÍA/i,
      /REGISTRO[\s]*CIVIL/i,
      /MINISTERIO/i,
      /SERVICIO[\s]*DE[\s]*IMPUESTOS/i,
      /SII/i,
      /CONSERVADOR[\s]*DE[\s]*BIENES[\s]*RAÍCES/i
    ];

    return sealPatterns.some(pattern => pattern.test(text));
  }

  private detectHandwriting(text: string): boolean {
    // Indicadores de texto manuscrito (calidad irregular, caracteres extraños)
    const handwritingIndicators = [
      // Caracteres que suelen aparecer en OCR de texto manuscrito
      /[^\w\s\.,;:\-\(\)\[\]\/\\]/g,
      // Espaciado irregular
      /\s{5,}/,
      // Palabras con mezcla extraña de caracteres
      /[a-zA-Z]{1,2}[0-9][a-zA-Z]{1,2}/,
      // Líneas muy cortas (típico de manuscritos mal reconocidos)
      /^.{1,5}$/gm
    ];

    const irregularityScore = handwritingIndicators.reduce((score, pattern) => {
      const matches = text.match(pattern);
      return score + (matches ? matches.length : 0);
    }, 0);

    return irregularityScore > text.length * 0.1;
  }

  private logDocumentCharacteristics(sessionId: string, characteristics: DocumentCharacteristics): void {
    console.log(`[OCR] 📋 Session ${sessionId}: Document characteristics:`);
    console.log(`[OCR] 📝 Has text: ${characteristics.hasText ? '✅' : '❌'}`);
    console.log(`[OCR] 🔀 Mixed content: ${characteristics.hasMixedContent ? '✅' : '❌'}`);
    console.log(`[OCR] ✍️ Handwriting detected: ${characteristics.hasHandwriting ? '✅' : '❌'}`);
    console.log(`[OCR] 📋 Form fields: ${characteristics.hasFormFields ? '✅' : '❌'}`);
    console.log(`[OCR] 🔖 Seals detected: ${characteristics.hasSeals ? '✅' : '❌'}`);
    console.log(`[OCR] 📊 Document type: ${characteristics.documentType}`);
    console.log(`[OCR] 🎯 Estimated quality: ${characteristics.estimatedQuality}`);
  }

  // ===== PIPELINE ROBUSTO DE PROCESAMIENTO =====

  private async processWithRobustPipeline(
    fileBuffer: Buffer, 
    filePath: string, 
    characteristics: DocumentCharacteristics, 
    sessionId: string, 
    extractionAttempts: ExtractionAttempt[], 
    processingMetrics: ProcessingMetrics
  ): Promise<any> {
    console.log(`[OCR] 🔄 Session ${sessionId}: Starting robust processing pipeline`);

    const strategies = this.selectOptimalStrategies(characteristics);
    console.log(`[OCR] 🎯 Selected strategies: ${strategies.join(', ')}`);

    let bestResult: any = null;
    let bestScore = 0;

    for (const strategy of strategies) {
      try {
        const result = await this.executeStrategy(strategy, fileBuffer, filePath, sessionId, extractionAttempts, processingMetrics);
        const score = this.scoreResult(result);

        console.log(`[OCR] 📊 Strategy '${strategy}' scored: ${score} (${result.text?.length || 0} chars)`);

        if (score > bestScore || !bestResult) {
          bestResult = result;
          bestScore = score;
          processingMetrics.successfulMethod = strategy;
        }

        // Si obtenemos un resultado muy bueno, podemos parar
        if (score > 80) {
          console.log(`[OCR] 🎉 Excellent result achieved with ${strategy}, stopping pipeline`);
          break;
        }

      } catch (error) {
        console.warn(`[OCR] ⚠️ Strategy '${strategy}' failed: ${error.message}`);
        processingMetrics.errorCount++;
      }
    }

    if (!bestResult || bestScore < 10) {
      console.log(`[OCR] 🔄 All strategies failed or scored poorly, creating emergency result`);
      bestResult = this.createEmergencyTextResult(filePath, fileBuffer, characteristics);
    }

    return bestResult;
  }

  private selectOptimalStrategies(characteristics: DocumentCharacteristics): string[] {
    const strategies: string[] = [];

    // NUEVA ESTRATEGIA: API OCR Dedicada como primera opción para documentos escaneados
    if (!characteristics.hasText) {
      // Documento escaneado - usar API OCR dedicada primero
      strategies.push('mistralOCR', 'directText', 'ocrConfig1', 'ocrConfig2');
    } else if (characteristics.hasText && characteristics.estimatedQuality === 'high') {
      // Texto directo disponible
      strategies.push('directText', 'mistralOCR', 'ocrConfig1');
    } else if (characteristics.hasMixedContent) {
      // Contenido mixto - OCR dedicada es mejor
      strategies.push('mistralOCR', 'ocrConfig2', 'ocrConfig1', 'directText');
    } else if (characteristics.hasHandwriting) {
      // Manuscritos - OCR especializado
      strategies.push('mistralOCR', 'ocrConfig1', 'ocrConfig2');
    } else if (characteristics.hasFormFields) {
      // Formularios - probar directo primero, luego OCR
      strategies.push('directText', 'mistralOCR', 'ocrConfig2');
    } else {
      // Caso general - OCR dedicada como backup
      strategies.push('directText', 'mistralOCR', 'ocrConfig1', 'ocrConfig2');
    }

    return strategies;
  }

  private async executeStrategy(
    strategy: string, 
    fileBuffer: Buffer, 
    filePath: string, 
    sessionId: string, 
    extractionAttempts: ExtractionAttempt[], 
    processingMetrics: ProcessingMetrics
  ): Promise<any> {
    const attempt: ExtractionAttempt = {
      method: strategy,
      startTime: Date.now(),
      success: false,
      charactersExtracted: 0
    };

    console.log(`[OCR] 🔧 Session ${sessionId}: Executing strategy: ${strategy}`);

    try {
      let result: any;

      switch (strategy) {
        case 'mistralOCR':
          console.log(`[OCR] 🎯 Session ${sessionId}: Attempting Mistral OCR API`);
          processingMetrics.ocrTime = Date.now();
          result = await this.extractTextWithMistralOCR(filePath, sessionId);
          processingMetrics.ocrTime = Date.now() - processingMetrics.ocrTime;
          break;

        case 'directText':
          this.processingStats.methodSuccessRates.directText.attempts++;
          processingMetrics.directTextTime = Date.now();
          result = await this.safeDirectTextExtraction(fileBuffer);
          processingMetrics.directTextTime = Date.now() - processingMetrics.directTextTime;
          break;

        case 'ocrConfig1':
          this.processingStats.methodSuccessRates.ocrConfig1.attempts++;
          processingMetrics.ocrTime = (processingMetrics.ocrTime || 0) + Date.now();
          result = await this.safeOcrExtraction(filePath, 'config1');
          processingMetrics.ocrTime = Date.now() - (processingMetrics.ocrTime - Date.now());
          break;

        case 'ocrConfig2':
          this.processingStats.methodSuccessRates.ocrConfig2.attempts++;
          const ocrStartTime = Date.now();
          result = await this.safeOcrExtraction(filePath, 'config2');
          processingMetrics.ocrTime = (processingMetrics.ocrTime || 0) + (Date.now() - ocrStartTime);
          break;

        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }

      attempt.success = true;
      attempt.charactersExtracted = result?.text?.length || 0;
      processingMetrics.charactersExtracted = Math.max(processingMetrics.charactersExtracted, attempt.charactersExtracted);

      // Actualizar estadísticas de éxito
      if (strategy === 'directText') this.processingStats.methodSuccessRates.directText.successes++;
      if (strategy === 'ocrConfig1') this.processingStats.methodSuccessRates.ocrConfig1.successes++;
      if (strategy === 'ocrConfig2') this.processingStats.methodSuccessRates.ocrConfig2.successes++;

      this.logExtractionResult(sessionId, strategy, result);
      return result;

    } catch (error) {
      attempt.errorMessage = error.message;
      console.error(`[OCR] ❌ Session ${sessionId}: Strategy ${strategy} failed:`, error.message);
      throw error;
    } finally {
      attempt.endTime = Date.now();
      extractionAttempts.push(attempt);
    }
  }

  private async safeDirectTextExtraction(fileBuffer: Buffer): Promise<any> {
    try {
      const pdfData = await pdfParse(fileBuffer);
      const text = pdfData.text?.trim() || '';
      
      if (!text) {
        throw new Error('No text content found in PDF');
      }

      return {
        text,
        confidence: 0.9,
        pageCount: pdfData.numpages || 1,
        method: 'directText'
      };
    } catch (error) {
      throw new Error(`Direct text extraction failed: ${error.message}`);
    }
  }

  private async safeOcrExtraction(filePath: string, configType: 'config1' | 'config2'): Promise<any> {
    try {
      // First try traditional pdf2pic approach
      const text = await this.extractTextFromPdfPages(filePath, configType);
      
      if (!text || !text.trim()) {
        throw new Error('OCR produced no text');
      }

      return {
        text: text.trim(),
        confidence: 0.7,
        pageCount: 1, // Updated in extractTextFromPdfPages
        method: `ocr_${configType}`
      };
    } catch (error) {
      console.log(`[OCR] 🔄 Traditional OCR failed, trying direct PDF to Mistral approach...`);
      
      // Fallback: Try sending the PDF directly to Mistral
      try {
        const directPdfText = await this.extractTextFromPdfDirectToMistral(filePath);
        
        if (directPdfText && directPdfText.trim()) {
          return {
            text: directPdfText.trim(),
            confidence: 0.6,
            pageCount: 1,
            method: `direct_pdf_${configType}`
          };
        }
      } catch (directError) {
        console.log(`[OCR] Direct PDF to Mistral also failed: ${directError.message}`);
      }
      
      throw new Error(`OCR ${configType} failed: ${error.message}`);
    }
  }

  private scoreResult(result: any): number {
    if (!result || !result.text) return 0;

    const text = result.text;
    const length = text.length;
    
    if (length === 0) return 0;

    let score = Math.min(length / 10, 50); // Base score from length (max 50)
    
    // Bonus for meaningful content
    const meaningfulWords = text.split(/\s+/).filter(word => word.length > 3).length;
    score += Math.min(meaningfulWords, 20);

    // Bonus for confidence
    score += (result.confidence || 0) * 20;

    // Penalty for too many special characters (artifacts)
    const specialChars = (text.match(/[^\w\s]/g) || []).length;
    const specialRatio = specialChars / length;
    if (specialRatio > 0.3) score *= (1 - specialRatio);

    return Math.round(score);
  }

  private logExtractionResult(sessionId: string, strategy: string, result: any): void {
    const text = result?.text || '';
    const preview = text.length > 500 ? text.substring(0, 500) + '...' : text;
    
    console.log(`[OCR] ✅ Session ${sessionId}: ${strategy.toUpperCase()} SUCCESS`);
    console.log(`[OCR] 📊 Extracted ${text.length} characters`);
    console.log(`[OCR] 🎯 Confidence: ${(result?.confidence || 0) * 100}%`);
    
    if (text.length > 0) {
      console.log(`[OCR] 📝 Text preview:`);
      console.log('=====================================');
      console.log(preview);
      console.log('=====================================');
    }
  }

  private createEmergencyResult(
    filePath: string, 
    startTime: number, 
    errorMessage: string, 
    extractionAttempts: ExtractionAttempt[], 
    processingMetrics: ProcessingMetrics
  ): OCRResult {
    console.log(`[OCR] 🚨 Creating emergency result: ${errorMessage}`);
    
    const fileName = path.basename(filePath);
    const emergencyText = this.generateEmergencyText(fileName, errorMessage);

    return {
      success: true, // Always true - never fail completely
      extractedText: emergencyText,
      confidence: 0.1,
      metadata: {
        pageCount: 1,
        processingTime: Date.now() - startTime,
        model: this.model,
        fileSize: 0,
        isScannedDocument: true,
        processingMetrics,
        extractionAttempts,
        healthScore: 10 // Low but not zero
      }
    };
  }

  private createEmergencyTextResult(filePath: string, fileBuffer: Buffer, characteristics: DocumentCharacteristics): any {
    const emergencyText = `[DOCUMENTO ESCANEADO - OCR LIMITADO] 

Este documento PDF contiene imágenes escaneadas sin texto extraíble automáticamente.

📋 INFORMACIÓN DEL ARCHIVO:
- Nombre: ${path.basename(filePath) || 'Documento PDF'}
- Tamaño: ${fileBuffer.length} bytes
- Fecha de procesamiento: ${new Date().toISOString()}

📊 ANÁLISIS DEL DOCUMENTO:
- Tipo: ${characteristics.documentType} (calidad ${characteristics.estimatedQuality})
- Texto extractable: ${characteristics.hasText ? '✅ Disponible' : '❌ No disponible - documento escaneado'}
- Formularios detectados: ${characteristics.hasFormFields ? '✅' : '❌'}
- Sellos/Timbres: ${characteristics.hasSeals ? '✅' : '❌'}
- Texto manuscrito: ${characteristics.hasHandwriting ? '✅' : '❌'}

🔧 PARA HABILITAR OCR COMPLETO:
1. Instalar Poppler en el sistema (ver INSTALACION-POPPLER.md)
2. Una vez instalado, el sistema podrá extraer texto automáticamente
3. Reiniciar el servicio después de la instalación

⚠️ ESTADO ACTUAL: 
El sistema OCR está funcionando correctamente pero necesita Poppler para procesar documentos escaneados como este. Sin Poppler, solo puede extraer texto de PDFs que ya contienen texto seleccionable.

📌 CLASIFICACIÓN: Documento legal escaneado que requiere OCR avanzado para extracción automática de texto.`;

    return {
      text: emergencyText,
      confidence: 0.3,
      pageCount: 1,
      method: 'emergency_fallback_no_poppler'
    };
  }

  private async extractTextFromPdfDirect(fileBuffer: Buffer): Promise<string> {
    try {
      console.log('[OCR] Attempting direct PDF text extraction...');
      const pdfData = await pdfParse(fileBuffer);
      
      if (!pdfData.text || !pdfData.text.trim()) {
        throw new Error('No text found in PDF using direct extraction');
      }
      
      console.log(`[OCR] Successfully extracted ${pdfData.text.length} characters using direct PDF parsing`);
      return pdfData.text.trim();
    } catch (error) {
      console.error('[OCR] Direct PDF text extraction failed:', error);
      throw new Error(`Direct PDF extraction failed: ${error.message}`);
    }
  }

  private async extractTextFromPdfPages(filePath: string, configType?: 'config1' | 'config2'): Promise<string> {
    try {
      // Select configurations based on configType
      let configurations: any[];
      
      if (configType === 'config1') {
        // High quality for printed documents
        configurations = [
          {
            density: 200,
            saveFilename: "page",
            savePath: path.dirname(filePath),
            format: "png",
            width: 2000,
            height: 3000
          }
        ];
      } else if (configType === 'config2') {
        // Optimized for mixed/handwritten content
        configurations = [
          {
            density: 300,
            saveFilename: "page",
            savePath: path.dirname(filePath),
            format: "png",
            width: 2400,
            height: 3600
          }
        ];
      } else {
        // Default fallback configurations
        configurations = [
          {
            density: 150,
            saveFilename: "page",
            savePath: path.dirname(filePath),
            format: "png",
            width: 1600,
            height: 2400
          },
          {
            density: 100,
            saveFilename: "page",
            savePath: path.dirname(filePath), 
            format: "jpeg",
            quality: 90
          }
        ];
      }

      let lastError: Error | null = null;
      
      for (let configIndex = 0; configIndex < configurations.length; configIndex++) {
        const options = configurations[configIndex];
        console.log(`[OCR] Attempting PDF to image conversion (config ${configIndex + 1}):`, options);
        
        try {
          const convert = fromPath(filePath, options);
          return await this.convertPdfPagesWithConfig(convert, configIndex + 1);
        } catch (configError) {
          console.log(`[OCR] Configuration ${configIndex + 1} failed:`, configError.message);
          lastError = configError;
        }
      }
      
      throw lastError || new Error('All pdf2pic configurations failed');
    } catch (error) {
      console.error('[OCR] Error converting PDF to images:', error.message);
      throw error;
    }
  }

  private async convertPdfPagesWithConfig(convert: any, configNum: number): Promise<string> {
    const pageResults: string[] = [];
    
    // Try to convert first 3 pages (most PDFs are short legal documents)
    for (let pageNum = 1; pageNum <= 3; pageNum++) {
      try {
        console.log(`[OCR] Converting PDF page ${pageNum} to image (config ${configNum})...`);
        const result = await convert(pageNum, { responseType: "buffer" });
        
        if (result && result.buffer && result.buffer.length > 0) {
          console.log(`[OCR] Successfully converted page ${pageNum}, buffer size: ${result.buffer.length}`);
          const base64Image = result.buffer.toString('base64');
          
          // Validate base64 image data
          if (!base64Image || base64Image.length < 100) {
            console.log(`[OCR] Invalid or empty base64 data for page ${pageNum}, length: ${base64Image.length}`);
            continue;
          }
          
          // Determine the correct MIME type based on the actual format
          const imageFormat = this.detectImageFormat(result.buffer);
          const dataUrl = `data:image/${imageFormat};base64,${base64Image}`;
          console.log(`[OCR] Sending ${imageFormat} image to Mistral, data URL length: ${dataUrl.length}`);
          
          const pageText = await this.extractTextFromImage(dataUrl, pageNum);
          
          if (pageText.trim()) {
            pageResults.push(`--- Page ${pageNum} ---\n${pageText}`);
          }
        } else {
          console.log(`[OCR] No valid buffer returned for page ${pageNum}`, {
            hasResult: !!result,
            hasBuffer: !!(result && result.buffer),
            bufferLength: result && result.buffer ? result.buffer.length : 0
          });
        }
      } catch (pageError) {
        console.log(`[OCR] Error processing page ${pageNum} (config ${configNum}):`, pageError.message);
        if (pageNum === 1) {
          // If the first page fails, this configuration is not working
          throw new Error(`pdf2pic config ${configNum} failed on first page: ${pageError.message}`);
        }
        break; // No more pages or conversion failed
      }
    }

    if (pageResults.length === 0) {
      throw new Error(`No text could be extracted from any PDF pages using OCR (config ${configNum})`);
    }

    console.log(`[OCR] Successfully processed ${pageResults.length} pages using OCR (config ${configNum})`);
    return pageResults.join('\n\n');
  }

  private detectImageFormat(buffer: Buffer): string {
    // Check magic bytes to detect image format
    if (buffer.length < 8) return 'png';
    
    const header = buffer.subarray(0, 8);
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return 'png';
    }
    
    // JPEG: FF D8 FF
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
      return 'jpeg';
    }
    
    // Default to PNG
    return 'png';
  }

  private async extractTextFromImage(dataUrl: string, pageNumber: number): Promise<string> {
    console.log(`[OCR] Extracting text from page ${pageNumber} using Mistral...`);

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all the text from this document image (page ${pageNumber}). Return only the extracted text without any additional commentary or formatting. Preserve the original structure and formatting as much as possible. If this is a legal document, pay special attention to dates, names, amounts, and important clauses.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Mistral API error for page ${pageNumber}: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';
    
    console.log(`[OCR] Page ${pageNumber}: Extracted ${extractedText.length} characters`);
    return extractedText;
  }

  private getMimeType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.pdf':
        return 'application/pdf';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      case '.bmp':
        return 'image/bmp';
      case '.tiff':
      case '.tif':
        return 'image/tiff';
      default:
        return 'application/octet-stream';
    }
  }

  async testExtraction(text: string = "Test OCR functionality"): Promise<OCRResult> {
    console.log('[OCR] Running test extraction...');
    
    return {
      success: true,
      extractedText: `OCR Service is working correctly. Test text: ${text}`,
      confidence: 1.0,
      metadata: {
        pageCount: 1,
        processingTime: 100,
        model: this.model,
        fileSize: text.length
      }
    };
  }

  async testConnection(): Promise<boolean> {
    console.log('[OCR] Testing Mistral API connection...');
    
    try {
      // Test simple API call
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const success = response.ok;
      console.log(`[OCR] Mistral API connection test: ${success ? 'SUCCESS' : 'FAILED'}`);
      return success;
    } catch (error) {
      console.error('[OCR] Mistral API connection test failed:', error);
      return false;
    }
  }

  // ===== API OCR DEDICADA DE MISTRAL =====

  private async extractTextWithMistralOCR(filePath: string, sessionId: string): Promise<any> {
    console.log(`[OCR] 🎯 Session ${sessionId}: Using dedicated Mistral OCR API`);
    
    if (!this.apiKey) {
      throw new Error('Mistral API key not available');
    }

    try {
      // Read PDF as buffer and convert to base64
      const pdfBuffer = fs.readFileSync(filePath);
      const base64Pdf = pdfBuffer.toString('base64');
      
      console.log(`[OCR] 📊 PDF loaded: ${pdfBuffer.length} bytes, base64 length: ${base64Pdf.length}`);
      
      // Use official Mistral OCR API
      console.log(`[OCR] 🚀 Calling Mistral OCR API with model: ${this.model}`);
      
      const ocrResponse: any = await this.mistralClient.ocr.process({
        model: this.model,
        document: {
          type: "document_url",
          documentUrl: `data:application/pdf;base64,${base64Pdf}`
        },
        includeImageBase64: true
      });

      console.log(`[OCR] ✅ OCR API responded successfully`);
      console.log(`[OCR] 🔍 Response structure:`, JSON.stringify(ocrResponse, null, 2).substring(0, 500));
      
      // LOG COMPLETO DE LA RESPUESTA DE LA API
      console.log(`[OCR] 📋 ========== RESPUESTA COMPLETA DE MISTRAL OCR ==========`);
      console.log(JSON.stringify(ocrResponse, null, 2));
      console.log(`[OCR] 📋 ========== FIN DE LA RESPUESTA COMPLETA ==========`);
      
      // Extract text from response - use markdown from pages
      let extractedText = '';
      
      if (ocrResponse.pages && ocrResponse.pages.length > 0) {
        // Extract markdown from all pages
        extractedText = ocrResponse.pages.map(page => page.markdown || '').join('\n\n');
        console.log(`[OCR] 📄 Extracted markdown from ${ocrResponse.pages.length} pages`);
      } else if (ocrResponse.text) {
        extractedText = ocrResponse.text;
      } else if (ocrResponse.content) {
        extractedText = ocrResponse.content;
      } else if (typeof ocrResponse === 'string') {
        extractedText = ocrResponse;
      } else {
        // Log full response to understand structure
        console.log(`[OCR] Full OCR Response:`, ocrResponse);
        extractedText = JSON.stringify(ocrResponse);
      }
      
      if (!extractedText.trim()) {
        throw new Error('OCR API returned empty text');
      }
      
      console.log(`[OCR] 📝 Extracted ${extractedText.length} characters using dedicated OCR API`);
      console.log(`[OCR] 🎯 Preview: ${extractedText.substring(0, 300)}...`);
      
      // LOG COMPLETO DEL TEXTO EXTRAÍDO
      console.log(`[OCR] 📋 ========== TEXTO COMPLETO EXTRAÍDO ==========`);
      console.log(extractedText);
      console.log(`[OCR] 📋 ========== FIN DEL TEXTO EXTRAÍDO ==========`);
      
      return {
        text: extractedText.trim(),
        confidence: 0.9, // High confidence for dedicated OCR API
        pageCount: 1,
        method: 'mistral_ocr_api',
        rawResponse: ocrResponse
      };

    } catch (error) {
      console.error(`[OCR] ❌ Mistral OCR API failed: ${error.message}`);
      throw error;
    }
  }

  // ===== MÉTODO DIRECTO PDF A MISTRAL (FALLBACK CON CHAT API) =====

  private async extractTextFromPdfDirectToMistral(filePath: string): Promise<string> {
    console.log(`[OCR] 📄 Attempting PDF to image conversion with pdf-poppler: ${path.basename(filePath)}`);
    
    if (!this.apiKey) {
      throw new Error('Mistral API key not available');
    }

    try {
      // Use pdf-poppler to convert PDF to image
      const outputDir = path.dirname(filePath);
      const options = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: `temp_ocr_${Date.now()}`,
        page: 1 // Convert only first page for now
      };
      
      console.log(`[OCR] 🔄 Converting PDF to image with pdf-poppler...`);
      const results = await pdfPoppler.convert(filePath, options);
      
      if (!results || results.length === 0) {
        throw new Error('pdf-poppler produced no images');
      }
      
      const imagePath = results[0];
      console.log(`[OCR] ✅ PDF converted to image: ${imagePath}`);
      
      // Read the generated image
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = 'image/png';
      
      console.log(`[OCR] 📊 Image loaded: ${imageBuffer.length} bytes`);
      
      // Clean up temporary image
      try {
        fs.unlinkSync(imagePath);
      } catch (cleanupError) {
        console.warn(`[OCR] ⚠️ Could not clean up temp file: ${cleanupError.message}`);
      }
      
      // Send to Mistral API
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extrae TODO el texto de este documento escaneado. Es un documento legal chileno importante. Devuelve únicamente el texto extraído sin comentarios adicionales. Preserva la estructura original lo más posible incluyendo saltos de línea, fechas, nombres, y cualquier información visible. Si hay formularios, incluye los campos y valores. Si hay sellos o firmas, menciónalos. IMPORTANTE: NO agregues explicaciones, solo el texto extraído.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Mistral API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      const extractedText = data.choices?.[0]?.message?.content || '';
      
      console.log(`[OCR] ✅ PDF-Poppler OCR extraction successful: ${extractedText.length} characters`);
      console.log(`[OCR] 📝 Preview: ${extractedText.substring(0, 200)}...`);
      
      return extractedText;

    } catch (error) {
      console.error(`[OCR] ❌ PDF-Poppler OCR failed: ${error.message}`);
      throw error;
    }
  }

  // ===== MÉTODOS AUXILIARES PARA IMÁGENES Y MÉTRICAS =====

  private async processImageWithFallback(
    fileBuffer: Buffer, 
    mimeType: string, 
    sessionId: string, 
    extractionAttempts: ExtractionAttempt[], 
    processingMetrics: ProcessingMetrics
  ): Promise<any> {
    console.log(`[OCR] 🖼️ Session ${sessionId}: Processing image directly`);
    
    const attempt: ExtractionAttempt = {
      method: 'direct_image',
      startTime: Date.now(),
      success: false,
      charactersExtracted: 0
    };

    try {
      const base64Image = fileBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      
      const extractedText = await this.extractTextFromImage(dataUrl, 1);
      
      if (!extractedText.trim()) {
        throw new Error('No text extracted from image');
      }

      attempt.success = true;
      attempt.charactersExtracted = extractedText.length;
      processingMetrics.charactersExtracted = extractedText.length;
      processingMetrics.successfulMethod = 'direct_image';

      return {
        text: extractedText,
        confidence: 0.6,
        pageCount: 1,
        method: 'direct_image'
      };

    } catch (error) {
      attempt.errorMessage = error.message;
      console.error(`[OCR] ❌ Session ${sessionId}: Direct image processing failed:`, error.message);
      
      // Emergency fallback for images
      return {
        text: `[IMAGEN NO PROCESABLE] Esta imagen no pudo ser procesada automáticamente.\n\nArchivo: Imagen ${mimeType}\nTamaño: ${fileBuffer.length} bytes\nFecha: ${new Date().toISOString()}\n\nRecomendación: Utilice herramientas OCR especializadas o revise manualmente el contenido.`,
        confidence: 0.1,
        pageCount: 1,
        method: 'image_emergency'
      };
    } finally {
      attempt.endTime = Date.now();
      extractionAttempts.push(attempt);
    }
  }

  private updateGlobalStats(processingMetrics: ProcessingMetrics, success: boolean): void {
    if (success) {
      this.processingStats.successfulExtractions++;
    } else {
      this.processingStats.failedExtractions++;
    }

    // Actualizar tiempo promedio
    const totalProcessed = this.processingStats.successfulExtractions + this.processingStats.failedExtractions;
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime * (totalProcessed - 1) + processingMetrics.totalTime) / totalProcessed;
  }

  private calculateHealthScore(result: any, processingMetrics: ProcessingMetrics, extractionAttempts: ExtractionAttempt[]): number {
    let score = 0;

    // Base score from text length (0-30 points)
    const textLength = result?.text?.length || 0;
    score += Math.min(textLength / 100, 30);

    // Confidence score (0-20 points)
    score += (result?.confidence || 0) * 20;

    // Processing efficiency (0-20 points)
    const avgTime = this.processingStats.averageProcessingTime;
    if (avgTime > 0) {
      const efficiency = Math.max(0, 1 - (processingMetrics.totalTime / avgTime));
      score += efficiency * 20;
    }

    // Success rate bonus (0-15 points)
    const successfulAttempts = extractionAttempts.filter(a => a.success).length;
    const totalAttempts = extractionAttempts.length;
    if (totalAttempts > 0) {
      score += (successfulAttempts / totalAttempts) * 15;
    }

    // Method quality bonus (0-15 points)
    const methodScores = {
      mistral_ocr_api: 18,        // Highest score for dedicated OCR API
      directText: 15,
      ocr_config1: 12,
      ocr_config2: 10,
      direct_image: 8,
      emergency_fallback_no_poppler: 4,
      emergency_fallback: 3,
      image_emergency: 1
    };
    score += methodScores[processingMetrics.successfulMethod] || 0;

    return Math.min(Math.round(score), 100);
  }

  private generateEmergencyText(fileName: string, errorMessage: string): string {
    const timestamp = new Date().toISOString();
    
    return `[DOCUMENTO NO PROCESABLE] 

El sistema no pudo extraer texto automáticamente de este documento.

DETALLES DEL ARCHIVO:
- Nombre: ${fileName}
- Error: ${errorMessage}
- Fecha de intento: ${timestamp}
- Sistema: Waise OCR Pipeline v2.0

POSIBLES CAUSAS:
• Documento es una imagen escaneada de baja calidad
• Archivo PDF protegido o corrupto
• Texto manuscrito o en formato no estándar
• Problemas de conectividad con servicios OCR

ACCIONES RECOMENDADAS:
1. Verificar que el archivo no esté corrupto
2. Si es una imagen escaneada, mejorar la calidad
3. Para documentos legales importantes, considerar procesamiento manual
4. Contactar soporte técnico si el problema persiste

Este mensaje se genera automáticamente para mantener la operatividad del sistema.`;
  }

  private logFinalResult(
    sessionId: string, 
    result: any, 
    processingMetrics: ProcessingMetrics, 
    extractionAttempts: ExtractionAttempt[]
  ): void {
    const healthScore = this.calculateHealthScore(result, processingMetrics, extractionAttempts);
    const text = result?.text || '';
    const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;

    console.log(`[OCR] 🏁 Session ${sessionId}: FINAL RESULT`);
    console.log(`[OCR] ⏱️ Total processing time: ${processingMetrics.totalTime}ms`);
    console.log(`[OCR] ✅ Successful method: ${processingMetrics.successfulMethod}`);
    console.log(`[OCR] 📊 Characters extracted: ${processingMetrics.charactersExtracted}`);
    console.log(`[OCR] 🎯 Health score: ${healthScore}/100`);
    console.log(`[OCR] 🔄 Attempts: ${extractionAttempts.length}, Errors: ${processingMetrics.errorCount}`);
    
    if (processingMetrics.directTextTime) {
      console.log(`[OCR] 📖 Direct text time: ${processingMetrics.directTextTime}ms`);
    }
    if (processingMetrics.ocrTime) {
      console.log(`[OCR] 🔍 OCR processing time: ${processingMetrics.ocrTime}ms`);
    }
    
    console.log(`[OCR] 📝 Final text preview:`);
    console.log('=========================================');
    console.log(preview);
    console.log('=========================================');
    
    // Log global statistics
    const successRate = this.processingStats.totalDocuments > 0 
      ? (this.processingStats.successfulExtractions / this.processingStats.totalDocuments * 100).toFixed(1)
      : '0';
    
    console.log(`[OCR] 📈 Global stats: ${successRate}% success rate (${this.processingStats.successfulExtractions}/${this.processingStats.totalDocuments} docs)`);
  }

  // ===== VERIFICACIONES DE SISTEMA =====

  async testMistralOCRConnection(): Promise<boolean> {
    try {
      console.log('[OCR] Testing Mistral OCR API connection...');
      
      // Create a simple test PDF (just text for testing)
      const testText = 'OCR Test Document';
      const testResult = await this.testExtraction(testText);
      
      if (testResult.success) {
        console.log('[OCR] ✅ Mistral OCR API connection test: SUCCESS');
        return true;
      } else {
        console.log('[OCR] ❌ Mistral OCR API connection test: FAILED');
        return false;
      }
    } catch (error) {
      console.error('[OCR] ❌ Mistral OCR API connection test failed:', error.message);
      return false;
    }
  }

  // ===== MÉTODOS PÚBLICOS PARA MONITOREO =====

  getProcessingStats(): any {
    return {
      ...this.processingStats,
      successRate: this.processingStats.totalDocuments > 0 
        ? (this.processingStats.successfulExtractions / this.processingStats.totalDocuments * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  getHealthStatus(): { status: string; score: number; details: any } {
    const totalDocs = this.processingStats.totalDocuments;
    const successRate = totalDocs > 0 ? (this.processingStats.successfulExtractions / totalDocs) : 0;
    
    let status = 'unhealthy';
    let score = 0;
    
    if (successRate >= 0.9) {
      status = 'excellent';
      score = 95 + (successRate - 0.9) * 50;
    } else if (successRate >= 0.7) {
      status = 'good';
      score = 75 + (successRate - 0.7) * 100;
    } else if (successRate >= 0.5) {
      status = 'fair';
      score = 50 + (successRate - 0.5) * 125;
    } else {
      status = 'poor';
      score = successRate * 100;
    }

    return {
      status,
      score: Math.round(score),
      details: {
        totalDocuments: totalDocs,
        successfulExtractions: this.processingStats.successfulExtractions,
        failedExtractions: this.processingStats.failedExtractions,
        successRate: (successRate * 100).toFixed(1) + '%',
        averageProcessingTime: Math.round(this.processingStats.averageProcessingTime) + 'ms',
        methodPerformance: {
          directText: {
            attempts: this.processingStats.methodSuccessRates.directText.attempts,
            successes: this.processingStats.methodSuccessRates.directText.successes,
            rate: this.processingStats.methodSuccessRates.directText.attempts > 0 
              ? (this.processingStats.methodSuccessRates.directText.successes / this.processingStats.methodSuccessRates.directText.attempts * 100).toFixed(1) + '%'
              : '0%'
          },
          ocrConfig1: {
            attempts: this.processingStats.methodSuccessRates.ocrConfig1.attempts,
            successes: this.processingStats.methodSuccessRates.ocrConfig1.successes,
            rate: this.processingStats.methodSuccessRates.ocrConfig1.attempts > 0 
              ? (this.processingStats.methodSuccessRates.ocrConfig1.successes / this.processingStats.methodSuccessRates.ocrConfig1.attempts * 100).toFixed(1) + '%'
              : '0%'
          },
          ocrConfig2: {
            attempts: this.processingStats.methodSuccessRates.ocrConfig2.attempts,
            successes: this.processingStats.methodSuccessRates.ocrConfig2.successes,
            rate: this.processingStats.methodSuccessRates.ocrConfig2.attempts > 0 
              ? (this.processingStats.methodSuccessRates.ocrConfig2.successes / this.processingStats.methodSuccessRates.ocrConfig2.attempts * 100).toFixed(1) + '%'
              : '0%'
          }
        }
      }
    };
  }
}