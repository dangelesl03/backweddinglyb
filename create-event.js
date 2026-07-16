require('dotenv').config();
const Event = require('./models/Event');

(async () => {
  try {
    console.log('🔍 Verificando si existe un evento...\n');
    
    // Verificar si ya existe un evento
    const existingEvent = await Event.findOne();
    
    if (existingEvent) {
      console.log('✅ Ya existe un evento:');
      console.log('   Título:', existingEvent.title || existingEvent.couple_names);
      console.log('   Fecha:', existingEvent.wedding_date);
      console.log('   ID:', existingEvent.id);
      process.exit(0);
    }
    
    console.log('📝 Creando nuevo evento...\n');
    
    // Crear el evento
    const event = await Event.create({
      title: '¡Acompañanos a celebrar!',
      coupleNames: 'Lucía & Bruno',
      weddingDate: '2026-10-17',
      location: 'Lima, Perú',
      address: 'Por definir - Próximamente',
      dressCode: 'Elegante',
      dressCodeDescription: 'Te invitamos a vestir en armonía con nuestros colores para que juntos pintemos un recuerdo para siempre. Los colores principales son rosa y morado.',
      additionalInfo: 'Será una celebración llena de amor, alegría y momentos inolvidables. ¡No podemos esperar a compartir este día tan especial con ustedes!'
    });
    
    console.log('✅ Evento creado exitosamente!');
    console.log('\n📋 Detalles del evento:');
    console.log('   ID:', event.id);
    console.log('   Título:', event.title || event.couple_names);
    console.log('   Pareja:', event.couple_names);
    console.log('   Fecha:', event.wedding_date);
    console.log('   Lugar:', event.location);
    console.log('   Dress Code:', event.dress_code);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando evento:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  }
})();
