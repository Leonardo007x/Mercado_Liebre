/**
 * Prompts centralizados para el asistente de IA (catálogo multi-rubro).
 */

export const PROMPT_SISTEMA_DEFAULT =
  'Eres un experto en copywriting y marketing digital para tiendas en línea (Mercado Liebre). ' +
  'Ayudas a dueños de negocio a vender cualquier tipo de producto o servicio: ropa, tecnología, hogar, ' +
  'belleza, alimentos, mascotas, herramientas, etc. ' +
  'Responde ÚNICAMENTE con el texto solicitado, sin comillas envolventes, sin explicaciones ni markdown.';

export const promptOrtografiaProducto = (nombre: string) =>
  `Corrige la ortografía del nombre de producto: "${nombre}". ` +
  'Respeta marcas y nombres propios válidos. Devuelve SOLO el nombre corregido, sin números ni símbolos raros.';

export const promptDescripcionProducto = (nombre: string, caracteristicas: string, maxChars: number) =>
  `Redacta una descripción corta y persuasiva para vender el producto "${nombre}" en un catálogo digital. ` +
  (caracteristicas.trim()
    ? `Características o atributos: ${caracteristicas}. `
    : '') +
  `Máximo ${maxChars} caracteres. Enfócate en beneficios para el comprador. Solo letras, números, puntos y comas.`;

export const promptCaracteristicasProducto = (nombre: string) =>
  `Sugiere 5 características o atributos clave del producto "${nombre}" para un catálogo en línea ` +
  '(material, tamaño, uso, compatibilidad, color, etc., según aplique). ' +
  'Separadas por coma. Solo letras y números.';

export const promptOrtografiaNombreTienda = (nombre: string) =>
  `Actúa como corrector ortográfico del nombre de la tienda: "${nombre}". ` +
  'Reglas: 1) Nombres de marca válidos (Rappi, Nike, etc.) NO se cambian. ' +
  '2) Solo corrige errores obvios. 3) Devuelve SOLO el nombre, sin explicaciones.';

export const promptEsloganTienda = (nombre: string) =>
  `Crea un eslogan corto, memorable y profesional para la tienda "${nombre}" ` +
  '(cualquier rubro: retail, servicios, productos físicos o digitales). Máximo 6 palabras.';

export const promptDescripcionTienda = (nombre: string) =>
  `Redacta una descripción acogedora y profesional para la tienda en línea "${nombre}". ` +
  'Invita a conocer el catálogo y genera confianza. Máximo 300 caracteres.';
