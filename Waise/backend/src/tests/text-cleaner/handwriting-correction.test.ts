/**
 * Test suite for handwriting corrections and text cleaning
 * Specific tests for manuscript document processing
 */

import { TextCleanerService } from '../../ocr/text-cleaner.service';

export class HandwritingCorrectionTest {
  private textCleaner: TextCleanerService;

  constructor() {
    this.textCleaner = new TextCleanerService();
  }

  runAllHandwritingTests(): void {
    console.log('✍️ HANDWRITING CORRECTION TEST SUITE\n');
    console.log('='.repeat(80));

    this.testBasicNameCorrections();
    this.testNumberLetterConfusions();
    this.testLegalTermCorrections();
    this.testChileanNamesAndSurnames();
    this.testMortgageDocumentPatterns();
    this.testComplexHandwritingScenarios();
  }

  testBasicNameCorrections(): void {
    console.log('\n📝 TEST 1: Basic Name Corrections');
    console.log('-'.repeat(50));

    const testCases = [
      'J0se Mam1a Rodriguez',
      'Car10s Pedr0 Martinez',
      'V1ctor Hect0r Gonzalez',
      'N1colas Andres Jimenez'
    ];

    testCases.forEach((testCase, index) => {
      const result = this.textCleaner.cleanOCRText(testCase);
      console.log(`${index + 1}. "${testCase}" → "${result.cleanText}"`);
    });
  }

  private testNumberLetterConfusions(): void {
    console.log('\n🔢 TEST 2: Number/Letter Confusions');
    console.log('-'.repeat(50));

    const testCases = [
      '0scar V1ctor con telefono 912345678',
      'Direccion: Prov1dencia N° 1234',
      'RUT: 12.345.678-9 y 5onia Lopez',
      'Fecha: 15 de Enero del 2021'
    ];

    testCases.forEach((testCase, index) => {
      const result = this.textCleaner.cleanOCRText(testCase);
      console.log(`${index + 1}. "${testCase}"`);
      console.log(`   → "${result.cleanText}"`);
    });
  }

  private testLegalTermCorrections(): void {
    console.log('\n⚖️ TEST 3: Legal Term Corrections');
    console.log('-'.repeat(50));

    const testCases = [
      'Esefitura publica ante el notam Rodriguez',
      'Inmueble ubicado en Santlago, Chlle',
      'Por escritum publica de fecha',
      'Notam: Humberto Santelices'
    ];

    testCases.forEach((testCase, index) => {
      const result = this.textCleaner.cleanOCRText(testCase);
      console.log(`${index + 1}. "${testCase}"`);
      console.log(`   → "${result.cleanText}"`);
    });
  }

  private testChileanNamesAndSurnames(): void {
    console.log('\n🇨🇱 TEST 4: Chilean Names and Surnames');
    console.log('-'.repeat(50));

    const testCases = [
      'Gonzalez, Rodriguez y Martinez',
      'Lopez, Garcia y Hernandez',
      'Sepulveda, Valenzuela y Contreras',
      'Munoz, Espinoza y Sepulveda'
    ];

    testCases.forEach((testCase, index) => {
      const result = this.textCleaner.cleanOCRText(testCase);
      console.log(`${index + 1}. "${testCase}"`);
      console.log(`   → "${result.cleanText}"`);
    });
  }

  private testMortgageDocumentPatterns(): void {
    console.log('\n🏠 TEST 5: Mortgage Document Patterns');
    console.log('-'.repeat(50));

    const testCases = [
      'Hipoteca de J0se Mam1a Rodriguez por UF 2.500',
      'Acreedor: N1colas Andres Mat1as Ce5ar',
      'Deudor: Camn Teresa Fmncisco Lopez',
      'Garante: 0scar V1ctor Garcia',
      'Tasa: 5% anual sobre saldo 1nsoluto',
      'Plazo: 20 años desde la esefitura'
    ];

    testCases.forEach((testCase, index) => {
      const result = this.textCleaner.cleanOCRText(testCase);
      console.log(`${index + 1}. "${testCase}"`);
      console.log(`   → "${result.cleanText}"`);
      console.log(`   Stats: ${result.stats.removedItems.folioReferences + result.stats.removedItems.repertorioCodes} removed`);
    });
  }

  private testComplexHandwritingScenarios(): void {
    console.log('\n🖋️ TEST 6: Complex Handwriting Scenarios');
    console.log('-'.repeat(50));

    const complexCases = [
      'Rodmguez, Gonzalez y Seba5tian como testigos de la esefitura',
      'J0se Car10s Pedr0 Mamtinez, RUT 12.345.678-9, domiciliado en Sant1ago',
      'Inmueble hipotecado por V1ctor Hect0r a N1colas Andres por $50.000.000',
      'Fmncisco Mamuel y Camn Teresa firman ante notam en Chlle'
    ];

    complexCases.forEach((testCase, index) => {
      console.log(`\n${index + 1}. COMPLEX SCENARIO:`);
      console.log(`ORIGINAL: ${testCase}`);
      
      const result = this.textCleaner.cleanOCRText(testCase);
      console.log(`CLEANED:  ${result.cleanText}`);
      console.log(`CHANGES:  ${testCase === result.cleanText ? 'None' : 'Applied'}`);
      
      if (result.stats) {
        const totalFixed = Object.values(result.stats.removedItems).reduce((a, b) => a + b, 0);
        const totalPreserved = Object.values(result.stats.preservedItems).reduce((a, b) => a + b, 0);
        console.log(`STATS:    ${totalFixed} items removed, ${totalPreserved} items preserved`);
      }
    });
  }

  testSpecificDocument(documentText: string, documentName: string = "Unknown"): void {
    console.log(`\n📄 TESTING SPECIFIC DOCUMENT: ${documentName}`);
    console.log('='.repeat(80));
    
    const result = this.textCleaner.cleanOCRText(documentText);
    
    console.log('ORIGINAL TEXT:');
    console.log('-'.repeat(40));
    console.log(documentText);
    
    console.log('\nCLEANED TEXT:');
    console.log('-'.repeat(40));
    console.log(result.cleanText);
    
    console.log('\nCLEANING STATISTICS:');
    console.log('-'.repeat(40));
    console.log(`Length: ${result.stats.originalLength} → ${result.stats.cleanedLength} chars`);
    console.log(`Folio refs removed: ${result.stats.removedItems.folioReferences}`);
    console.log(`Repertorio codes removed: ${result.stats.removedItems.repertorioCodes}`);
    console.log(`Marginal numbers removed: ${result.stats.removedItems.marginalNumbers}`);
    console.log(`Dates preserved: ${result.stats.preservedItems.dates}`);
    console.log(`Names preserved: ${result.stats.preservedItems.names}`);
  }
}