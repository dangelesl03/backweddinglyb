// Asegurar que dotenv se cargue primero si no se ha cargado ya
try {
  require('dotenv').config();
} catch (e) {
  // dotenv puede no estar disponible
}

// Homologar variables de entorno con prefijo wed2_ (minúscula o MAYÚSCULA)
const prefix = 'wed2_';
const variablesToPrefix = [
  'POSTGRES_URL',
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'JWT_SECRET',
  'PORT',
  'FRONTEND_URL',
  'NODE_ENV',
  'POSTGRES_URL_ORIGINAL'
];

variablesToPrefix.forEach(varName => {
  const prefixedLower = `${prefix}${varName}`;
  const prefixedUpper = `${prefix.toUpperCase()}${varName}`;
  
  // Buscar valor con prefijo (prioridad minúscula, luego MAYÚSCULA)
  const prefixedVal = process.env[prefixedLower] || process.env[prefixedUpper];
  
  if (prefixedVal) {
    // Sobrescribir la variable base en process.env
    process.env[varName] = prefixedVal;
  }
});

// Asegurar que DATABASE_URL siempre sea un string válido
const getDatabaseUrl = () => {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    return '';
  }
  // Convertir a string y limpiar espacios
  return String(url).trim();
};

module.exports = {
  // PostgreSQL connection - Vercel/Neon compatible
  DATABASE_URL: getDatabaseUrl(),
  JWT_SECRET: process.env.JWT_SECRET || 'tu_jwt_secret_aqui',
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development'
};
