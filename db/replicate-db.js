const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Cargar variables de entorno de .env
require('dotenv').config();

const originalUrl = process.env.POSTGRES_URL_ORIGINAL;
const newUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!originalUrl) {
  console.error('❌ ERROR: POSTGRES_URL_ORIGINAL no está configurada en el archivo .env');
  process.exit(1);
}

if (!newUrl || newUrl.includes('<DATABASE_URL>')) {
  console.error('❌ ERROR: POSTGRES_URL / DATABASE_URL no está configurada con un valor real en el archivo .env');
  process.exit(1);
}

console.log('🔌 Conectando a las bases de datos...');
const poolOriginal = new Pool({
  connectionString: originalUrl,
  ssl: { rejectUnauthorized: false }
});

const poolNew = new Pool({
  connectionString: newUrl,
  ssl: { rejectUnauthorized: false }
});

// Función para inicializar el esquema en la base de datos destino
async function initTargetSchema() {
  console.log('⚡ Inicializando el esquema en la nueva base de datos...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Limpiar comentarios
    schema = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
    
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await poolNew.query(statement);
      } catch (err) {
        // Ignorar errores si la tabla o relación ya existe
        if (!err.message.includes('already exists') && 
            !err.message.includes('duplicate') &&
            !err.message.includes('does not exist')) {
          console.warn('⚠️  Advertencia al crear objeto de esquema:', err.message);
        }
      }
    }
    console.log('✅ Esquema inicializado en la base de datos destino.');
  } catch (error) {
    console.error('❌ Error al inicializar esquema destino:', error.message);
    throw error;
  }
}

// Función principal de migración
async function migrateData() {
  try {
    // 1. Inicializar esquema
    await initTargetSchema();
    
    // 2. Definir tablas en orden de dependencia
    const tables = [
      'users',
      'events',
      'categories',
      'gifts',
      'gift_contributions',
      'dedications'
    ];
    
    console.log('\n🚀 Iniciando replicación de datos...');
    
    for (const table of tables) {
      console.log(`\n--------------------------------------`);
      console.log(`📦 Procesando tabla: "${table}"`);
      
      // A. Limpiar tabla en destino (con CASCADE para evitar errores de claves foráneas)
      console.log(`   🧹 Limpiando registros existentes en destino...`);
      await poolNew.query(`TRUNCATE TABLE ${table} CASCADE`);
      
      // B. Obtener columnas en origen y destino para encontrar la intersección
      const origColsResult = await poolOriginal.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      
      const newColsResult = await poolNew.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      
      const origCols = origColsResult.rows.map(r => r.column_name);
      const newCols = newColsResult.rows.map(r => r.column_name);
      
      // Intersección de columnas
      const columns = origCols.filter(col => newCols.includes(col));
      
      if (columns.length === 0) {
        console.log(`   ⚠️ No se encontraron columnas coincidentes para la tabla ${table}. Omitiendo.`);
        continue;
      }
      
      console.log(`   📋 Columnas a replicar: [${columns.join(', ')}]`);
      
      // C. Obtener todos los registros desde origen
      const querySelect = `SELECT ${columns.map(c => `"${c}"`).join(', ')} FROM "${table}" ORDER BY id ASC`;
      const selectResult = await poolOriginal.query(querySelect);
      const rows = selectResult.rows;
      
      console.log(`   📥 Leídos ${rows.length} registros desde el origen.`);
      
      if (rows.length === 0) {
        console.log(`   ℹ️ Sin datos para replicar.`);
        continue;
      }
      
      // D. Insertar registros en destino
      console.log(`   📤 Insertando registros en la base de datos destino...`);
      
      // Iniciar una transacción para consistencia y velocidad
      const clientNew = await poolNew.connect();
      try {
        await clientNew.query('BEGIN');
        
        for (const row of rows) {
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const queryInsert = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
          const values = columns.map(col => row[col]);
          
          await clientNew.query(queryInsert, values);
        }
        
        await clientNew.query('COMMIT');
        console.log(`   ✅ Replicados exitosamente ${rows.length} registros en "${table}".`);
      } catch (insertError) {
        await clientNew.query('ROLLBACK');
        console.error(`   ❌ Error al insertar registros en "${table}":`, insertError.message);
        throw insertError;
      } finally {
        clientNew.release();
      }
      
      // E. Reiniciar la secuencia de ID de la tabla para que empiece después del valor máximo
      try {
        const seqCheck = await poolNew.query(`
          SELECT pg_get_serial_sequence($1, 'id') as seq_name
        `, [table]);
        
        const seqName = seqCheck.rows[0]?.seq_name;
        if (seqName) {
          console.log(`   🔄 Actualizando secuencia de ID: ${seqName}`);
          await poolNew.query(`
            SELECT setval($1, COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)
          `, [seqName]);
          console.log(`   ✅ Secuencia actualizada correctamente.`);
        }
      } catch (seqError) {
        console.warn(`   ⚠️  No se pudo actualizar la secuencia de ID para la tabla "${table}":`, seqError.message);
      }
    }
    
    console.log('\n======================================');
    console.log('✨ MIGRACIÓN Y REPLICACIÓN COMPLETADA CON ÉXITO ✨');
    console.log('======================================');
    
  } catch (error) {
    console.error('\n💥 ERROR FATAL DURANTE LA MIGRACIÓN:', error.message);
    process.exit(1);
  } finally {
    await poolOriginal.end();
    await poolNew.end();
  }
}

// Ejecutar migración
migrateData();
