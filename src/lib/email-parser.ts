/**
 * Parses raw email content and extracts clean body text/html
 * Removes email headers and MIME boundaries
 */

export function parseEmailBody(rawText: string | null, rawHtml: string | null): {
  text: string;
  html: string | null;
} {
  let cleanText = '';
  let cleanHtml: string | null = null;

  // First try to parse HTML if it looks like raw email
  if (rawHtml) {
    if (isRawEmail(rawHtml)) {
      const parsed = parseRawEmail(rawHtml);
      cleanHtml = parsed.html;
      cleanText = parsed.text;
    } else {
      cleanHtml = rawHtml;
    }
  }

  // Then try text
  if (rawText) {
    if (isRawEmail(rawText)) {
      const parsed = parseRawEmail(rawText);
      if (!cleanHtml && parsed.html) {
        cleanHtml = parsed.html;
      }
      if (!cleanText && parsed.text) {
        cleanText = parsed.text;
      }
    } else if (!cleanText) {
      cleanText = rawText;
    }
  }

  return {
    text: cleanText,
    html: cleanHtml,
  };
}

function isRawEmail(content: string): boolean {
  if (!content) return false;
  
  // Check if content starts with common email headers
  const firstLine = content.trim().split('\n')[0] || '';
  
  const headerStarts = [
    'Received:',
    'Return-Path:',
    'Delivered-To:',
    'X-',
    'ARC-',
    'DKIM-',
    'From:',
    'To:',
    'Subject:',
    'Date:',
    'Message-ID:',
    'MIME-Version:',
    'Content-Type:',
  ];

  for (const header of headerStarts) {
    if (firstLine.startsWith(header)) {
      return true;
    }
  }

  // Also check for boundary pattern which indicates MIME
  if (content.includes('boundary=') && content.includes('Content-Type:')) {
    return true;
  }

  return false;
}

function parseRawEmail(rawEmail: string): { text: string; html: string | null } {
  let text = '';
  let html: string | null = null;

  // Find MIME boundary
  const boundaryMatch = rawEmail.match(/boundary="?([^"\s\r\n]+)"?/);
  
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    // Split by boundary
    const boundaryRegex = new RegExp(`--${escapeRegex(boundary)}(?:--)?`, 'g');
    const parts = rawEmail.split(boundaryRegex);

    for (const part of parts) {
      if (!part.trim()) continue;

      // Check content type of this part
      const ctMatch = part.match(/Content-Type:\s*([^\s;]+)/i);
      if (!ctMatch) continue;

      const contentType = ctMatch[1].toLowerCase();

      // Find where headers end and body begins (double newline)
      const headerBodySplit = part.match(/\r?\n\r?\n([\s\S]*)/);
      if (!headerBodySplit) continue;

      let body = headerBodySplit[1];

      // Check for transfer encoding
      const isQuotedPrintable = /Content-Transfer-Encoding:\s*quoted-printable/i.test(part);
      const isBase64 = /Content-Transfer-Encoding:\s*base64/i.test(part);

      if (isQuotedPrintable) {
        body = decodeQuotedPrintable(body);
      } else if (isBase64) {
        try {
          body = decodeBase64(body);
        } catch {
          // Keep as is if decode fails
        }
      }

      // Clean the body
      body = body.trim();

      if (contentType === 'text/plain' && !text) {
        text = body;
      } else if (contentType === 'text/html' && !html) {
        html = body;
      }
    }
  } else {
    // No MIME boundary - simple email
    // Find the body after all headers (headers end with double newline)
    const parts = rawEmail.split(/\r?\n\r?\n/);
    
    if (parts.length > 1) {
      // Skip headers, take the rest as body
      // Find where headers end - look for a line that doesn't look like a header
      let headerEndIndex = 0;
      const lines = rawEmail.split(/\r?\n/);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Empty line marks end of headers
        if (line.trim() === '') {
          headerEndIndex = i;
          break;
        }
      }

      text = lines.slice(headerEndIndex + 1).join('\n').trim();

      // Check if original had quoted-printable
      if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(rawEmail)) {
        text = decodeQuotedPrintable(text);
      }
    }
  }

  return { text, html };
}

function decodeQuotedPrintable(str: string): string {
  if (!str) return '';
  
  return str
    // Handle soft line breaks (= at end of line)
    .replace(/=\r?\n/g, '')
    // Handle encoded characters like =E2=80=99 (UTF-8 bytes)
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    })
    // Fix any UTF-8 that was decoded byte by byte
    .replace(/[\xC0-\xDF][\x80-\xBF]/g, (match) => {
      const bytes = [match.charCodeAt(0), match.charCodeAt(1)];
      const codePoint = ((bytes[0] & 0x1F) << 6) | (bytes[1] & 0x3F);
      return String.fromCharCode(codePoint);
    })
    .replace(/[\xE0-\xEF][\x80-\xBF]{2}/g, (match) => {
      const bytes = [match.charCodeAt(0), match.charCodeAt(1), match.charCodeAt(2)];
      const codePoint = ((bytes[0] & 0x0F) << 12) | ((bytes[1] & 0x3F) << 6) | (bytes[2] & 0x3F);
      return String.fromCodePoint(codePoint);
    })
    .replace(/[\xF0-\xF7][\x80-\xBF]{3}/g, (match) => {
      const bytes = [match.charCodeAt(0), match.charCodeAt(1), match.charCodeAt(2), match.charCodeAt(3)];
      const codePoint = ((bytes[0] & 0x07) << 18) | ((bytes[1] & 0x3F) << 12) | ((bytes[2] & 0x3F) << 6) | (bytes[3] & 0x3F);
      return String.fromCodePoint(codePoint);
    });
}

function decodeBase64(str: string): string {
  const cleaned = str.replace(/\s/g, '');
  return atob(cleaned);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
