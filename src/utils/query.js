'use strict';

/**
 * Helper pembentuk SQL dinamis sederhana.
 * Menjaga query tetap tervalidasi (tanpa string concat berbahaya).
 */

/** Membuat placeholder "?, ?, ?" sesuai jumlah item */
function placeholders(items) {
  return items.map(() => '?').join(', ');
}

/**
 * Menyusun klausa WHERE dari object filter.
 * Hanya kolom yang ada di `allowed` yang dipakai.
 */
function buildWhere(filters, allowed) {
  const clauses = [];
  const params = [];

  for (const [key, value] of Object.entries(filters)) {
    if (!allowed.includes(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    clauses.push(`${key} = ?`);
    params.push(value);
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

/** Parsing nomor halaman & limit dari query string */
function pagination(query, perPage = 10) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.perPage, 10) || perPage));
  return { page, limit, offset: (page - 1) * limit };
}

/** Metadata paginasi untuk view */
function paginationMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    from: total === 0 ? 0 : (page - 1) * limit + 1,
    to: Math.min(page * limit, total),
  };
}

module.exports = { placeholders, buildWhere, pagination, paginationMeta };
