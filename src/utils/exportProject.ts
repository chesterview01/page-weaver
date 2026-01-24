import { CodeOutput, ProjectOutput } from '@/types/chat';

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

export const downloadAsZip = async (code: CodeOutput, projectName: string = 'mi-proyecto', project?: ProjectOutput | null) => {
  const { default: JSZip } = await import('jszip');
  
  const zip = new JSZip();
  const safeName = projectName.replace(/\s+/g, '-').toLowerCase();
  
  // If we have a project structure, use it
  if (project && project.files.length > 0) {
    project.files.forEach(file => {
      zip.file(file.path, file.content);
    });
    
    // Add README if not present
    if (!project.files.find(f => f.path.toLowerCase() === 'readme.md')) {
      zip.file('README.md', `# ${project.projectName}

Este proyecto fue generado con WebBuilderAI.

## Estructura del proyecto

${project.files.map(f => `- \`${f.path}\``).join('\n')}

## Uso

1. Instala las dependencias: \`npm install\`
2. Inicia el servidor de desarrollo: \`npm run dev\`

---
Generado el ${new Date().toLocaleDateString('es-ES')}
`);
    }
  } else {
    // Legacy format - single files
    zip.file('index.html', generateFullHTML(code));
    zip.file('style.css', code.css || '/* No CSS */');
    zip.file('script.js', code.js || '// No JavaScript');
    
    zip.file('README.md', `# ${safeName}

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
  }

  // Generate the ZIP file
  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export project as JSON structure
export const exportProjectAsJSON = (project: ProjectOutput): string => {
  return JSON.stringify(project, null, 2);
};

// Download project structure as JSON
export const downloadAsJSON = (project: ProjectOutput) => {
  const json = exportProjectAsJSON(project);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.projectName.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
