import * as PDFJS from 'pdfjs-dist';
import type { TextItem, TextContent } from 'pdfjs-dist/types/src/display/api';
import mammoth from 'mammoth';

// Set PDF.js worker
PDFJS.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent() as TextContent;
      text += content.items
        .filter((item): item is TextItem => 'str' in item)
        .map(item => item.str)
        .join(' ') + '\n';
    }
    
    return text.trim();
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

export async function extractTextFromTXT(file: File): Promise<string> {
  try {
    const text = await file.text();
    return text.trim();
  } catch (error) {
    console.error('Error extracting TXT text:', error);
    throw new Error('Failed to extract text from TXT');
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // First try to read as plain text for any file
  try {
    const text = await file.text();
    // Check if the text is readable (not binary)
    if (isReadableText(text)) {
      return text.trim();
    }
  } catch (error) {
    console.log('File is not readable as plain text, trying specialized extractors...');
  }

  // Fall back to specialized extractors for known formats
  switch (extension) {
    case 'pdf':
      return extractTextFromPDF(file);
    case 'docx':
      return extractTextFromDOCX(file);
    default:
      throw new Error('Unable to extract text from this file type');
  }
}

// Helper function to check if text is readable (not binary)
function isReadableText(text: string): boolean {
  // Check if the text contains mostly printable ASCII characters
  const printableChars = text.replace(/[\x20-\x7E\n\r\t]/g, '');
  const ratio = printableChars.length / text.length;
  
  // If less than 10% of characters are non-printable, consider it readable text
  return ratio < 0.1 && text.length > 0;
} 
