const { query } = require('../db');

class Dedication {
  static async find(options = {}) {
    let sql = 'SELECT * FROM dedications WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (options.isApproved !== undefined) {
      sql += ` AND is_approved = $${paramIndex}`;
      params.push(options.isApproved);
      paramIndex++;
    }

    sql += ' ORDER BY created_at DESC';

    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
    }

    const result = await query(sql, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await query('SELECT * FROM dedications WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(data) {
    const { message, senderName } = data;
    const result = await query(
      'INSERT INTO dedications (message, sender_name, is_approved) VALUES ($1, $2, $3) RETURNING *',
      [message, senderName, true] // Por defecto aprobadas automáticamente
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const { message, senderName, isApproved } = data;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (message !== undefined) {
      updates.push(`message = $${paramIndex}`);
      params.push(message);
      paramIndex++;
    }

    if (senderName !== undefined) {
      updates.push(`sender_name = $${paramIndex}`);
      params.push(senderName);
      paramIndex++;
    }

    if (isApproved !== undefined) {
      updates.push(`is_approved = $${paramIndex}`);
      params.push(isApproved);
      paramIndex++;
    }

    if (updates.length === 0) {
      return await this.findById(id);
    }

    params.push(id);
    const sql = `UPDATE dedications SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(sql, params);
    return result.rows[0] || null;
  }

  static async delete(id) {
    const result = await query('DELETE FROM dedications WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  }
}

module.exports = Dedication;
