// Utility functions for exporting text content to different file formats

export function downloadTextFile(content: string, filename: string = 'documento.txt') {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPDFFile(content: string, filename: string = 'documento.pdf') {
  // Create a simple PDF using HTML to PDF conversion
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <style>
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.6;
          margin: 1in;
          color: #000;
          background: #fff;
        }
        .content {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        @media print {
          body { margin: 0.5in; }
        }
      </style>
    </head>
    <body>
      <div class="content">${content.replace(/\n/g, '<br>')}</div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, 500);
}

export function generateFilename(content: string, extension: string): string {
  // Generate filename from first line or first few words
  const firstLine = content.split('\n')[0].trim();
  let filename = 'documento';
  
  if (firstLine.length > 0) {
    filename = firstLine
      .substring(0, 30)
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
  }
  
  if (!filename || filename === '') {
    filename = 'documento';
  }
  
  return `${filename}.${extension}`;
}