/**
 * Parses raw email content and extracts clean body text/html
 * Removes email headers and MIME boundaries
 */

export function parseEmailBody(rawText: string | null, rawHtml: string | null): {
  text: string;
  html: string | null;
} {
  // If we have HTML, try to extract it from MIME if present
  let cleanHtml = rawHtml;
  let cleanText = rawText || '';

  // Check if this is a raw email with headers
  if (cleanText && isRawEmail(cleanText)) {
    const parsed = parseRawEmail(cleanText);
    cleanText = parsed.text;
    if (parsed.html) {
      cleanHtml = parsed.html;
    }
  }

  // Also check HTML for raw email content
  if (cleanHtml && isRawEmail(cleanHtml)) {
    const parsed = parseRawEmail(cleanHtml);
    if (parsed.html) {
      cleanHtml = parsed.html;
    } else if (parsed.text) {
      cleanText = parsed.text;
      cleanHtml = null;
    }
  }

  return {
    text: cleanText,
    html: cleanHtml,
  };
}

function isRawEmail(content: string): boolean {
  // Check for common email headers at the start
  const headerPatterns = [
    /^Received:/m,
    /^From:/m,
    /^To:/m,
    /^Subject:/m,
    /^MIME-Version:/m,
    /^Content-Type:/m,
    /^DKIM-Signature:/m,
    /^ARC-/m,
    /^X-Google-/m,
    /^X-Gm-/m,
    /^Message-ID:/m,
  ];

  // If it starts with headers, it's raw email
  const firstLines = content.substring(0, 2000);
  let headerCount = 0;
  
  for (const pattern of headerPatterns) {
    if (pattern.test(firstLines)) {
      headerCount++;
    }
  }

  return headerCount >= 3;
}

function parseRawEmail(rawEmail: string): { text: string; html: string | null } {
  let text = '';
  let html: string | null = null;

  // Try to find MIME boundary
  const boundaryMatch = rawEmail.match(/boundary=\\"?([^\s"]+)\\"?/);
  
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = rawEmail.split(new RegExp(`--${escapeRegex(boundary)}`));

    for (const part of parts) {
      // Skip empty parts and closing boundary
      if (!part.trim() || part.startsWith('--')) continue;

      const contentTypeMatch = part.match(/Content-Type:\s*([^\s;]+)/i);
      if (!contentTypeMatch) continue;

      const contentType = contentTypeMatch[1].toLowerCase();
      
      // Extract body (after the first double newline)
      const bodyMatch = part.match(/\r?\n\r?\n([\s\S]*)/);
      if (!bodyMatch) continue;

      let body = bodyMatch[1].trim();

      // Handle quoted-printable encoding
      if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(part)) {
        body = decodeQuotedPrintable(body);
      }
      // Handle base64 encoding
      else if (/Content-Transfer-Encoding:\s*base64/i.test(part)) {
        try {
          body = atob(body.replace(/\s/g, ''));
        } catch {
          // Keep as is if decode fails
        }
      }

      if (contentType === 'text/plain' && !text) {
        text = body;
      } else if (contentType === 'text/html' && !html) {
        html = body;
      }
    }
  } else {
    // No MIME boundary, try to extract body after headers
    // Headers end with double newline
    const headerBodySplit = rawEmail.match(/^([\s\S]*?)\r?\n\r?\n([\s\S]*)$/);
    
    if (headerBodySplit) {
      text = headerBodySplit[2].trim();
      
      // Check for quoted-printable
      if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headerBodySplit[1])) {
        text = decodeQuotedPrintable(text);
      }
    } else {
      text = rawEmail;
    }
  }

  // Clean up any remaining MIME artifacts
  text = cleanMimeArtifacts(text);
  if (html) {
    html = cleanMimeArtifacts(html);
  }

  return { text, html };
}

function decodeQuotedPrintable(str: string): string {
  return str
    // Handle soft line breaks
    .replace(/=\r?\n/g, '')
    // Handle encoded characters
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

function cleanMimeArtifacts(content: string): string {
  return content
    // Remove any remaining boundary markers
    .replace(/--[a-zA-Z0-9]+--?\s*/g, '')
    // Remove Content-Type headers that might be in the body
    .replace(/Content-Type:.*\r?\n/gi, '')
    .replace(/Content-Transfer-Encoding:.*\r?\n/gi, '')
    .trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
