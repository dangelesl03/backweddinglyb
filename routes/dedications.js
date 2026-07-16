const express = require('express');
const Dedication = require('../models/Dedication');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Obtener todas las dedicatorias (público, solo aprobadas)
router.get('/', async (req, res) => {
  try {
    const { limit } = req.query;
    const dedications = await Dedication.find({ 
      isApproved: true,
      limit: limit ? parseInt(limit) : undefined
    });
    res.json(dedications);
  } catch (error) {
    console.error('Error obteniendo dedicatorias:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Crear una nueva dedicatoria (público)
router.post('/', async (req, res) => {
  try {
    const { message, senderName } = req.body;

    // Validaciones
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'El mensaje de la dedicatoria es requerido.' });
    }

    if (!senderName || senderName.trim().length === 0) {
      return res.status(400).json({ message: 'El nombre del remitente es requerido.' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ message: 'El mensaje no puede exceder 1000 caracteres.' });
    }

    const dedication = await Dedication.create({
      message: message.trim(),
      senderName: senderName.trim()
    });

    res.status(201).json(dedication);
  } catch (error) {
    console.error('Error creando dedicatoria:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Obtener todas las dedicatorias (admin - incluye no aprobadas)
router.get('/admin', auth, adminAuth, async (req, res) => {
  try {
    const dedications = await Dedication.find({});
    res.json(dedications);
  } catch (error) {
    console.error('Error obteniendo dedicatorias:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Actualizar dedicatoria (solo admin)
router.put('/:id', auth, adminAuth, async (req, res) => {
  try {
    const { message, senderName, isApproved } = req.body;
    
    if (message && message.length > 1000) {
      return res.status(400).json({ message: 'El mensaje no puede exceder 1000 caracteres.' });
    }

    const updatedDedication = await Dedication.update(req.params.id, {
      message,
      senderName,
      isApproved
    });

    if (!updatedDedication) {
      return res.status(404).json({ message: 'Dedicatoria no encontrada.' });
    }

    res.json(updatedDedication);
  } catch (error) {
    console.error('Error actualizando dedicatoria:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

// Eliminar dedicatoria (solo admin)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const deletedDedication = await Dedication.delete(req.params.id);
    
    if (!deletedDedication) {
      return res.status(404).json({ message: 'Dedicatoria no encontrada.' });
    }

    res.json({ message: 'Dedicatoria eliminada exitosamente.', dedication: deletedDedication });
  } catch (error) {
    console.error('Error eliminando dedicatoria:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
});

module.exports = router;
