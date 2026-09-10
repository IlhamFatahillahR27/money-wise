/**
 * Safe Arithmetic Calculator Utility
 * Mendukung evaluasi operasi matematika dasar (+, -, *, /, x, :)
 * tanpa menggunakan eval() atau new Function() untuk keamanan penuh.
 */

import { formatThousand } from './currency';

const OPERATORS_REGEX = /[+\-*xX×/:\u00F7]/;

/**
 * Memeriksa apakah string input mengandung operator aritmatika.
 */
export function hasArithmeticOperator(expr: string): boolean {
  if (!expr || typeof expr !== 'string') return false;
  return OPERATORS_REGEX.test(expr);
}

/**
 * Membersihkan karakter input sehingga hanya mengizinkan:
 * angka, operator (+, -, *, x, X, ×, /, :, ÷), titik, koma, kurung, dan spasi.
 */
export function sanitizeArithmeticInput(val: string): string {
  if (!val) return '';
  // Hanya izinkan angka, operator, kurung, titik, koma, spasi, dan sama dengan
  return val.replace(/[^0-9+\-*xX×/:\u00F7.,()=\s]/g, '');
}

/**
 * Mengevaluasi ekspresi aritmatika string menjadi angka murni (number).
 * Mendukung format ribuan Indonesia bertitik (misal "1.000 * 59" -> 59000).
 * Mengembalikan null jika ekspresi belum selesai/tidak valid (misal "1000*").
 */
export function evaluateArithmeticExpression(expr: string): number | null {
  if (!expr || typeof expr !== 'string') return null;

  const trimmed = expr.trim();
  if (!trimmed) return null;

  // Jika tidak ada operator, parsing langsung
  if (!hasArithmeticOperator(trimmed)) {
    const clean = trimmed.replace(/=/g, '').trim();
    if (!clean) return null;
    const num = parseTokenNumber(clean);
    return isNaN(num) ? null : num;
  }

  // Normalisasi operator dan hilangkan tanda '=' jika ada
  const normalized = trimmed
    .replace(/[xX×]/g, '*')
    .replace(/[:\u00F7]/g, '/')
    .replace(/=/g, '')
    .trim();

  if (!normalized) return null;

  // 1. Tokenisasi
  const tokens: (number | string)[] = [];
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (['+', '-', '*', '/', '(', ')'].includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }

    // Karakter angka / titik / koma
    if (/[0-9.,]/.test(char)) {
      let numStr = '';
      while (i < normalized.length && /[0-9.,]/.test(normalized[i])) {
        numStr += normalized[i];
        i++;
      }

      const numVal = parseTokenNumber(numStr);
      if (isNaN(numVal)) return null;
      tokens.push(numVal);
      continue;
    }

    // Karakter tidak dikenal
    return null;
  }

  if (tokens.length === 0) return null;

  // Jika token terakhir adalah operator, ekspresi belum selesai (misal "1000*")
  const lastToken = tokens[tokens.length - 1];
  if (typeof lastToken === 'string' && ['+', '-', '*', '/'].includes(lastToken)) {
    return null;
  }

  // 2. Tangani tanda minus unary (misal di awal "-5 + 10" atau setelah "(" / operator)
  const processedTokens: (number | string)[] = [];
  for (let j = 0; j < tokens.length; j++) {
    const t = tokens[j];
    if (
      t === '-' &&
      (j === 0 || tokens[j - 1] === '(' || ['+', '-', '*', '/'].includes(tokens[j - 1] as string))
    ) {
      const next = tokens[j + 1];
      if (typeof next === 'number') {
        processedTokens.push(-next);
        j++;
      } else {
        return null;
      }
    } else {
      processedTokens.push(t);
    }
  }

  // 3. Shunting-Yard Algorithm ke Reverse Polish Notation (RPN)
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const outputQueue: (number | string)[] = [];
  const operatorStack: string[] = [];

  for (const token of processedTokens) {
    if (typeof token === 'number') {
      outputQueue.push(token);
    } else if (typeof token === 'string' && ['+', '-', '*', '/'].includes(token)) {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1] !== '(' &&
        (precedence[operatorStack[operatorStack.length - 1]] || 0) >= (precedence[token] || 0)
      ) {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.push(token);
    } else if (token === '(') {
      operatorStack.push(token);
    } else if (token === ')') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        outputQueue.push(operatorStack.pop()!);
      }
      if (operatorStack.length === 0) return null; // Kurung tutup tanpa pasangan
      operatorStack.pop(); // Hapus '('
    }
  }

  while (operatorStack.length > 0) {
    const op = operatorStack.pop()!;
    if (op === '(' || op === ')') return null; // Kurung tidak seimbang
    outputQueue.push(op);
  }

  // 4. Evaluasi RPN
  const evalStack: number[] = [];
  for (const item of outputQueue) {
    if (typeof item === 'number') {
      evalStack.push(item);
    } else {
      if (evalStack.length < 2) return null;
      const b = evalStack.pop()!;
      const a = evalStack.pop()!;
      let res = 0;
      switch (item) {
        case '+':
          res = a + b;
          break;
        case '-':
          res = a - b;
          break;
        case '*':
          res = a * b;
          break;
        case '/':
          if (b === 0) return null; // Cegah pembagian dengan nol
          res = a / b;
          break;
        default:
          return null;
      }
      evalStack.push(res);
    }
  }

  if (evalStack.length !== 1 || isNaN(evalStack[0])) return null;

  // Bulatkan ke maksimal 2 desimal jika pecahan
  const finalVal = evalStack[0];
  return Math.round(finalVal * 100) / 100;
}

/**
 * Parsing token angka individual dengan dukungan format angka Indonesia.
 */
function parseTokenNumber(str: string): number {
  if (!str) return NaN;

  // Jika mengandung koma sebagai desimal (e.g. "25,5")
  if (str.includes(',') && !str.includes('.')) {
    return parseFloat(str.replace(',', '.'));
  }

  // Jika mengandung titik pemisah ribuan (e.g. "1.000" atau "1.500.000")
  if (str.includes('.')) {
    if (str.includes(',')) {
      const normalized = str.replace(/\./g, '').replace(',', '.');
      return parseFloat(normalized);
    }
    // Jika hanya titik, di Indonesia adalah pemisah ribuan
    const clean = str.replace(/\./g, '');
    return parseFloat(clean);
  }

  return parseFloat(str);
}

/**
 * Format hasil evaluasi kembali ke format string sesuai tipe input.
 */
export function formatCalculationResult(
  result: number,
  type: 'currency' | 'number' | 'text' = 'currency'
): string {
  if (isNaN(result)) return '';
  if (type === 'currency') {
    return formatThousand(result);
  }
  // Untuk angka murni: jika bulat jangan ada desimal
  return Number.isInteger(result) ? result.toString() : result.toString().replace('.', ',');
}
