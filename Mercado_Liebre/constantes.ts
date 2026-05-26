
/**
 * Descripción: Definición de variables de entorno y constantes globales del sistema.
 */

// Las variables sensibles viven en backend/microservicios (no en frontend).

// Opciones de configuración visual
export const FUENTES = [
  { nombre: 'Playfair Display', valor: 'Playfair Display' },
  { nombre: 'Inter', valor: 'Inter' },
  { nombre: 'Roboto', valor: 'Roboto' },
  { nombre: 'Open Sans', valor: 'Open Sans' },
  { nombre: 'Lato', valor: 'Lato' },
  { nombre: 'Montserrat', valor: 'Montserrat' },
];

export const DIAS_SEMANA = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
];

// Límites de caracteres estandarizados para todos los formularios
export const LIMITES = { 
  TIENDA_NOMBRE: 50,
  TIENDA_ESLOGAN: 100,
  TIENDA_DESC: 500,
  TIENDA_EMAIL: 100,
  TIENDA_TELEFONO: 10, // 10 dígitos exactos
  TIENDA_DIRECCION: 120,
  TIENDA_CIUDAD: 50,
  TIENDA_URL: 200, // Facebook, Instagram

  PRODUCTO_NOMBRE: 60,
  PRODUCTO_DESC: 250,
  PRODUCTO_CAT: 50,
  PRODUCTO_CARACTERISTICAS: 300,
  
  ADDR_NUM: 10, 
  ADDR_TEXT: 50 
};
