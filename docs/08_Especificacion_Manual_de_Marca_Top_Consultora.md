# **\# DOCUMENTO 8 — ESPECIFICACIÓN DEL MANUAL DE MARCA “TOP CONSULTORA”**

# **\#\# v1.0**

# 

# **\> Este documento define el estándar de “Manual de Marca” que debe generar la app.**

# **\> Objetivo: entregable extremadamente completo, profesional y comparable a consultoras de primer nivel.**

# **\> Válido para Módulo A (Creación de Marca) y puede incorporar insumos del Módulo B (Brand Strategy).**

# 

# **\---**

# 

# **\#\# 1\) Definición del entregable**

# **El “Manual de Marca” es un PDF (y/o set de PDFs) \+ carpeta de assets que documenta:**

# **\- Fundamentos estratégicos (resumen ejecutivo)**

# **\- Identidad verbal (tono, mensajes, do/don’t)**

# **\- Identidad visual (logo, color, tipografía, sistema gráfico)**

# **\- Sistema de aplicación (templates y reglas por canal)**

# **\- Accesibilidad y consistencia**

# **\- Archivos maestros listos para producción**

# 

# **\---**

# 

# **\#\# 2\) Formatos y export final**

# **\#\#\# 2.1 Manual (PDF)**

# **\- Formato: A4 (o US Letter según idioma/mercado; por defecto A4)**

# **\- Estilo: premium, limpio, consistente, con índice**

# **\- Incluye: tabla de contenidos \+ numeración \+ versión**

# 

# **\#\#\# 2.2 Assets (ZIP)**

# **Estructura obligatoria:**

# 

# /brand-manual/

# /01\_manual\_pdf/

# BrandManual\_vX.Y\_\<ProjectName\>\_\<Lang\>.pdf

# /02\_logo/

# /master\_vector/ (SVG \+ PDF vector)

# /png/

# /light/

# /dark/

# /favicon\_app/

# /03\_color/

# palettes.json

# palettes.ase (opcional)

# /04\_typography/

# licensing\_note.txt

# font\_links.txt

# /05\_iconography/

# /06\_imagery\_style/

# /07\_templates/

# /social/

# /presentation/

# /stationery/

# /web\_ui/

# /08\_examples\_do\_dont/

# /meta/

# versions.json

# generation\_params.json

# changelog.md

\#\#\# 2.3 Metadatos (obligatorio)  
\- versión del manual  
\- fecha  
\- módulo origen (A/B)  
\- versión de PromptSet/WorkflowSet  
\- proveedor/modelo (Managed/BYO)  
\- autor (usuario) \+ organización

\---

\#\# 3\) Estructura mínima del Manual (capítulos obligatorios)

\#\#\# 3.1 Portada \+ índice  
\- Nombre de la marca  
\- Tagline (si existe)  
\- Versión del manual  
\- Fecha  
\- Organización / proyecto  
\- Idioma

\#\#\# 3.2 Resumen ejecutivo (1–2 páginas)  
\- Qué es la marca  
\- A quién sirve (audiencia)  
\- Qué promete (propuesta de valor)  
\- Diferenciadores principales  
\- Principales “no-negociables” de uso de marca

\#\#\# 3.3 Fundamentos estratégicos (compacto pero sólido)  
\- Posicionamiento (1 párrafo \+ bullets)  
\- Territorio de marca  
\- Personalidad / arquetipo (si aplica)  
\- Principios: 3–6 (do’s) y 3–6 (don’ts)  
\> Si el proyecto tiene Módulo B (Brand Strategy), aquí se incorpora síntesis del Strategy Pack.

\#\#\# 3.4 Identidad verbal (Voice)  
\- Tono de voz: 4–6 atributos con definición  
\- “Cómo suena” vs “Cómo no suena”  
\- Glosario de palabras recomendadas y palabras a evitar  
\- Mensajes núcleo:  
  \- Elevator pitch  
  \- One-liner  
  \- 3 mensajes clave  
  \- Claims permitidos/prohibidos (si aplica)  
\- Ejemplos por canal:  
  \- Website hero  
  \- Email  
  \- Social post  
  \- Ads (si aplica)

\#\#\# 3.5 Logo: sistema completo  
\*\*Este capítulo debe ser extremadamente riguroso.\*\*

\#\#\#\# 3.5.1 Versiones del logo (mínimo)  
\- Primary (completo)  
\- Secondary (alternativo)  
\- Wordmark (solo texto) si existe  
\- Icon / Isotipo  
\- Horizontal lockup  
\- Vertical lockup  
\- Monocromo (negro)  
\- Monocromo (blanco)  
\- Reverse (para fondos oscuros)

\#\#\#\# 3.5.2 Área de protección (clear space)  
\- Definición geométrica (regla simple)  
\- Ejemplos visuales

\#\#\#\# 3.5.3 Tamaños mínimos  
\- Digital: px recomendado para legibilidad  
\- Print: mm recomendado

\#\#\#\# 3.5.4 Fondos permitidos  
\- Fondo claro  
\- Fondo oscuro  
\- Fondo de color de paleta  
\- Fondo fotográfico (con reglas)

\#\#\#\# 3.5.5 Usos incorrectos (mínimo 8\)  
\- Deformar  
\- Cambiar colores  
\- Cambiar proporciones  
\- Añadir sombras no autorizadas  
\- Rotar  
\- Cambiar tipografía  
\- Poner sobre fondos sin contraste  
\- Colocar dentro de contenedores no autorizados

\#\#\#\# 3.5.6 Favicon / App icon / Social avatar  
\- Favicon 16/32/48  
\- App icon 512 (si aplica)  
\- Social avatar 1:1

\---

\#\# 4\) Sistema de color (con accesibilidad)  
\#\#\# 4.1 Paleta  
\- Primary colors (1–3)  
\- Secondary colors (2–6)  
\- Neutrals (mínimo 5: negro/blanco \+ grises)  
\- Accent (1–2)

\#\#\# 4.2 Especificaciones por color  
Para cada color:  
\- HEX  
\- RGB  
\- CMYK (aprox)  
\- Nombre interno (ej. “Primary 600”)  
\- Uso recomendado (titulares, botones, fondos, etc.)

\#\#\# 4.3 Contraste y accesibilidad  
\- Reglas de contraste mínimo (por ejemplo: textos sobre fondos)  
\- Recomendaciones prácticas:  
  \- “Este color no se usa para texto pequeño”  
  \- “Este color solo para acentos”  
\- Ejemplos visuales de combinaciones buenas/malas

\---

\#\# 5\) Tipografía  
\#\#\# 5.1 Tipografía primaria  
\- Nombre \+ estilo  
\- Usos: headings/body/buttons  
\- Jerarquías (H1/H2/H3/Body/Caption)  
\- Interlineado y tracking recomendados

\#\#\# 5.2 Tipografía secundaria (si aplica)  
\- Reglas de combinación  
\- Casos de uso

\#\#\# 5.3 Fallbacks (web-safe)  
\- Stack recomendado (si no se puede cargar la tipografía)

\#\#\# 5.4 Reglas de legibilidad  
\- Tamaños mínimos  
\- Contraste  
\- Longitud de línea recomendada

\---

\#\# 6\) Sistema gráfico: layout, grid y componentes  
\#\#\# 6.1 Grid  
\- 12-col grid (web) \+ márgenes  
\- Sistema de espaciado (8pt o similar)  
\- Bordes/radius (si aplica)

\#\#\# 6.2 Componentes (si aplica a la marca)  
\- Botones (primario/segundario/terciario)  
\- Inputs, cards, badges  
\- Estados: hover/pressed/disabled

\#\#\# 6.3 Motion (si aplica)  
\- Principios de animación  
\- Duraciones y curvas  
\- Ejemplos por componente

\---

\#\# 7\) Iconografía e ilustración (si aplica)  
\- Estilo (lineal/solid/duotone)  
\- Grosor  
\- Esquinas  
\- Reglas de consistencia  
\- Ejemplos correctos/incorrectos

\---

\#\# 8\) Fotografía y estilo visual (si aplica)  
\- Dirección de arte: luz, composición, temperatura, textura  
\- Qué buscar / qué evitar  
\- Ejemplos de encuadres y situaciones  
\- Reglas para overlays (gradientes, texto sobre foto)

\---

\#\# 9\) Aplicaciones de marca (mínimo por canal)  
\#\#\# 9.1 Papelería  
\- Tarjeta personal  
\- Hoja membretada  
\- Firma de email

\#\#\# 9.2 Social  
\- Plantilla post 1:1  
\- Plantilla story 9:16  
\- Plantilla cover/banners

\#\#\# 9.3 Web / landing  
\- Hero section  
\- Sección beneficios  
\- CTA  
\- Footer  
\- Estilo de botones/links

\#\#\# 9.4 Presentación  
\- Master slide  
\- Slide de título  
\- Slide de contenido  
\- Slide de cierre

\> Nota: en v1, la app genera aplicaciones “mockup” y templates básicos. La suite se amplía por plan.

\---

\#\# 10\) Checklist de calidad (QA del manual)  
Un manual se considera “aprobable” solo si:  
\- Logos en vector (SVG/PDF) \+ PNGs correctos  
\- Clear space y tamaños mínimos definidos  
\- Paleta completa y consistente (HEX/RGB/CMYK)  
\- Tipografías con reglas \+ fallbacks  
\- Do/Don’t con ejemplos claros  
\- Aplicaciones por canal mínimas incluidas  
\- Metadatos y versión incluidos  
\- Coherencia con Brand Core Profile

\---

\#\# 11\) Cómo se genera desde la app  
\- El manual se genera al final del Módulo A  
\- Puede regenerarse con feedback específico:  
  \- “Ajustar tono”  
  \- “Cambiar paleta”  
  \- “Modificar jerarquías tipográficas”  
\- Cualquier regeneración crea nueva versión del manual.

\---

\#\# 12\) Entregable mínimo vs entregable Pro  
El sistema debe soportar niveles:  
\- Basic: manual compacto (15–25 páginas)  
\- Mid: manual completo (25–40 páginas)  
\- Pro: manual consultora (40–70 páginas) \+ templates extendidos \+ audit/logos más exhaustivos

