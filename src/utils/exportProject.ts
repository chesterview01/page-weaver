import { CodeOutput } from '@/types/chat';

export const generateFullHTML = (code: CodeOutput): string => {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mi Proyecto - WebBuilderAI</title>
  <style>
${code.css}
  </style>
</head>
<body>
${code.html}
  <script>
${code.js}
  </script>
</body>
</html>`;
};

export const downloadAsZip = async (code: CodeOutput, projectName: string = 'mi-proyecto') => {
  // We'll use JSZip library for creating the ZIP file
  const { default: JSZip } = await import('jszip');
  
  const zip = new JSZip();
  
  // Add files to the ZIP
  zip.file('index.html', generateFullHTML(code));
  zip.file('style.css', code.css || '/* No CSS */');
  zip.file('script.js', code.js || '// No JavaScript');
  
  // Add a README
  zip.file('README.md', `# ${projectName}

Este proyecto fue generado con WebBuilderAI.

## Archivos incluidos

- \`index.html\` - Página principal con todo el código
- \`style.css\` - Estilos CSS
- \`script.js\` - Código JavaScript

## Uso

Simplemente abre \`index.html\` en tu navegador para ver el proyecto.

---
Generado el ${new Date().toLocaleDateString('es-ES')}
`);

  // Generate the ZIP file
  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
