/**
 * Script para eliminar dedicatorias
 * Uso: node delete-dedications.js [opciones]
 * 
 * Opciones:
 *   --all          Eliminar todas las dedicatorias
 *   --id <id>      Eliminar dedicatoria por ID
 *   --name <name>  Eliminar dedicatorias por nombre del remitente
 *   --before <date> Eliminar dedicatorias antes de una fecha (YYYY-MM-DD)
 *   --dry-run      Solo mostrar qué se eliminaría sin eliminar realmente
 */

const Dedication = require('./models/Dedication');
const { query } = require('./db');

async function deleteDedications() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  try {
    console.log('🔍 Buscando dedicatorias...\n');

    let dedicationsToDelete = [];
    let condition = '';

    if (args.includes('--all')) {
      dedicationsToDelete = await Dedication.find({});
      condition = 'Todas las dedicatorias';
    } else if (args.includes('--id')) {
      const idIndex = args.indexOf('--id');
      const id = args[idIndex + 1];
      if (!id) {
        console.error('❌ Error: Debes proporcionar un ID después de --id');
        process.exit(1);
      }
      const dedication = await Dedication.findById(id);
      if (dedication) {
        dedicationsToDelete = [dedication];
        condition = `ID: ${id}`;
      } else {
        console.log(`⚠️  No se encontró dedicatoria con ID: ${id}`);
        process.exit(0);
      }
    } else if (args.includes('--name')) {
      const nameIndex = args.indexOf('--name');
      const name = args.slice(nameIndex + 1).join(' ');
      if (!name) {
        console.error('❌ Error: Debes proporcionar un nombre después de --name');
        process.exit(1);
      }
      const result = await query(
        'SELECT * FROM dedications WHERE LOWER(sender_name) = LOWER($1)',
        [name]
      );
      dedicationsToDelete = result.rows;
      condition = `Nombre: "${name}"`;
    } else if (args.includes('--before')) {
      const dateIndex = args.indexOf('--before');
      const date = args[dateIndex + 1];
      if (!date) {
        console.error('❌ Error: Debes proporcionar una fecha después de --before (formato: YYYY-MM-DD)');
        process.exit(1);
      }
      const result = await query(
        'SELECT * FROM dedications WHERE created_at < $1',
        [date]
      );
      dedicationsToDelete = result.rows;
      condition = `Antes de: ${date}`;
    } else {
      console.log('📋 Uso del script:');
      console.log('   node delete-dedications.js --all                    # Eliminar todas');
      console.log('   node delete-dedications.js --id <id>                # Eliminar por ID');
      console.log('   node delete-dedications.js --name "<nombre>"        # Eliminar por nombre');
      console.log('   node delete-dedications.js --before YYYY-MM-DD      # Eliminar antes de fecha');
      console.log('   Agregar --dry-run al final para solo ver qué se eliminaría\n');
      process.exit(0);
    }

    if (dedicationsToDelete.length === 0) {
      console.log('✅ No se encontraron dedicatorias para eliminar.');
      process.exit(0);
    }

    console.log(`📊 Se encontraron ${dedicationsToDelete.length} dedicatoria(s) con condición: ${condition}\n`);

    if (dryRun) {
      console.log('🔍 Modo dry-run: Estas son las dedicatorias que se eliminarían:\n');
      dedicationsToDelete.forEach((d, index) => {
        console.log(`${index + 1}. ID: ${d.id}`);
        console.log(`   Mensaje: "${d.message.substring(0, 50)}${d.message.length > 50 ? '...' : ''}"`);
        console.log(`   De: ${d.sender_name}`);
        console.log(`   Fecha: ${d.created_at}`);
        console.log('');
      });
      console.log('💡 Para eliminar realmente, ejecuta el comando sin --dry-run');
      process.exit(0);
    }

    // Confirmar eliminación
    console.log('⚠️  ADVERTENCIA: Estás a punto de eliminar las siguientes dedicatorias:\n');
    dedicationsToDelete.forEach((d, index) => {
      console.log(`${index + 1}. ID: ${d.id} - "${d.message.substring(0, 50)}${d.message.length > 50 ? '...' : ''}" - De: ${d.sender_name}`);
    });
    console.log('\n⏳ Eliminando en 3 segundos... (Ctrl+C para cancelar)');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Eliminar dedicatorias
    let deletedCount = 0;
    for (const dedication of dedicationsToDelete) {
      try {
        await Dedication.delete(dedication.id);
        deletedCount++;
        console.log(`✅ Eliminada dedicatoria ID: ${dedication.id}`);
      } catch (error) {
        console.error(`❌ Error eliminando dedicatoria ID ${dedication.id}:`, error.message);
      }
    }

    console.log(`\n✨ Proceso completado: ${deletedCount} dedicatoria(s) eliminada(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteDedications();
