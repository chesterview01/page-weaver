import { supabase } from '@/integrations/supabase/client';

export async function generateThumbnail(html: string, css: string, js: string): Promise<string | null> {
  try {
    // Create a complete HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>${js}</script>
        </body>
      </html>
    `;

    // Create an iframe to render the HTML
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '1200px';
    iframe.style.height = '800px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Write HTML to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return null;
    }

    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();

    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 500));

    // Use html2canvas to capture the content
    const { default: html2canvas } = await import('html2canvas');
    
    const canvas = await html2canvas(iframeDoc.body, {
      width: 1200,
      height: 800,
      scale: 0.25,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Clean up iframe
    document.body.removeChild(iframe);

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.8);
    });

    if (!blob) return null;

    // Generate unique filename
    const filename = `thumbnail_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('thumbnails')
      .upload(filename, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
      });

    if (error) {
      console.error('Error uploading thumbnail:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

export async function deleteThumbnail(thumbnailUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const urlParts = thumbnailUrl.split('/');
    const filename = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from('thumbnails')
      .remove([filename]);

    if (error) {
      console.error('Error deleting thumbnail:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    return false;
  }
}
