import { useState, useCallback } from 'react';
import { Message, Version, CodeOutput } from '@/types/chat';

// Demo code output for illustration
const generateDemoCode = (prompt: string): CodeOutput => {
  const isHero = prompt.toLowerCase().includes('hero') || prompt.toLowerCase().includes('landing');
  const isCard = prompt.toLowerCase().includes('card') || prompt.toLowerCase().includes('tarjeta');
  
  if (isHero || prompt.toLowerCase().includes('landing')) {
    return {
      html: `
<section class="hero">
  <div class="hero-content">
    <h1 class="hero-title">Construye el Futuro</h1>
    <p class="hero-subtitle">Crea páginas web increíbles con el poder de la inteligencia artificial</p>
    <div class="hero-buttons">
      <button class="btn-primary">Comenzar Ahora</button>
      <button class="btn-secondary">Ver Demo</button>
    </div>
  </div>
  <div class="hero-glow"></div>
</section>`,
      css: `
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  position: relative;
  overflow: hidden;
  padding: 2rem;
}

.hero-content {
  text-align: center;
  z-index: 1;
  max-width: 700px;
}

.hero-title {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #94a3b8;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%);
  color: #0f172a;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 30px rgba(34, 211, 238, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 40px rgba(34, 211, 238, 0.5);
}

.btn-secondary {
  padding: 0.875rem 2rem;
  background: transparent;
  color: #f8fafc;
  border: 1px solid #334155;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #1e293b;
  border-color: #475569;
}

.hero-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}`,
      js: `
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', function() {
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.style.transform = '';
    }, 150);
  });
});`
    };
  }

  if (isCard) {
    return {
      html: `
<div class="card-container">
  <div class="card">
    <div class="card-image">
      <span class="card-badge">Nuevo</span>
    </div>
    <div class="card-content">
      <h3 class="card-title">Título de la Tarjeta</h3>
      <p class="card-description">Una descripción breve y elegante del contenido de esta tarjeta.</p>
      <button class="card-btn">Ver más</button>
    </div>
  </div>
</div>`,
      css: `
.card-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  padding: 2rem;
}

.card {
  background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
  border-radius: 1.5rem;
  overflow: hidden;
  width: 100%;
  max-width: 350px;
  border: 1px solid #334155;
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
}

.card-image {
  height: 200px;
  background: linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%);
  position: relative;
}

.card-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #0f172a;
  color: #22d3ee;
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.card-content {
  padding: 1.5rem;
}

.card-title {
  color: #f8fafc;
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.card-description {
  color: #94a3b8;
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.card-btn {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%);
  color: #0f172a;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.card-btn:hover {
  box-shadow: 0 0 30px rgba(34, 211, 238, 0.4);
}`,
      js: `
document.querySelector('.card-btn').addEventListener('click', () => {
  alert('¡Botón clickeado!');
});`
    };
  }

  // Default simple page
  return {
    html: `
<main class="page">
  <h1 class="title">${prompt.substring(0, 50)}</h1>
  <p class="description">Contenido generado basado en tu solicitud</p>
</main>`,
    css: `
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 2rem;
  text-align: center;
}

.title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #22d3ee;
  margin-bottom: 1rem;
}

.description {
  color: #94a3b8;
  font-size: 1.125rem;
}`,
    js: ''
  };
};

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<CodeOutput | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const code = generateDemoCode(content);
    
    const assistantMessage: Message = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      content: `¡He generado el código para tu solicitud! Puedes ver la vista previa a la derecha. El código incluye HTML, CSS y JavaScript listos para usar.`,
      timestamp: new Date(),
      codeOutput: code,
    };

    const newVersion: Version = {
      id: `v-${Date.now()}`,
      timestamp: new Date(),
      label: content.substring(0, 40) + (content.length > 40 ? '...' : ''),
      code,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setVersions(prev => [newVersion, ...prev]);
    setCurrentVersion(newVersion.id);
    setCurrentCode(code);
    setIsLoading(false);
  }, []);

  const selectVersion = useCallback((versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      setCurrentVersion(versionId);
      setCurrentCode(version.code);
    }
  }, [versions]);

  return {
    messages,
    versions,
    currentVersion,
    currentCode,
    isLoading,
    sendMessage,
    selectVersion,
  };
};
