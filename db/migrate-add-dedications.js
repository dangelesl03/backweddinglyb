/**
 * Migración: Agregar tabla de dedicatorias
 * Ejecutar con: node backend/db/migrate-add-dedications.js
 */

const { query } = require('../db');

async function migrateDedications() {
  try {
    console.log('🔄 Iniciando migración: Agregar tabla de dedicatorias...\n');

    // Verificar si la tabla ya existe
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dedications'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ La tabla dedications ya existe. No se requiere migración.');
      process.exit(0);
    }

    // Crear tabla de dedicatorias
    await query(`
      CREATE TABLE IF NOT EXISTS dedications (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL CHECK (LENGTH(message) <= 1000),
        sender_name VARCHAR(255) NOT NULL,
        is_approved BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tabla dedications creada exitosamente.');

    // Crear trigger para updated_at
    await query(`
      CREATE TRIGGER update_dedications_updated_at 
      BEFORE UPDATE ON dedications
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Trigger update_dedications_updated_at creado exitosamente.');
    console.log('\n✨ Migración completada exitosamente!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateDedications();
