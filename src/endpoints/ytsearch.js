export const meta = {
  name: 'YouTube Search',
  method: 'GET',
  path: '/api/ytsearch',
  description: 'Busca videos en YouTube usando yt-dlp.',
  creator: 'ֆǟɨ'
};

export async function run(req, env) {
  const url = new URL(req.url);

  const q = url.searchParams.get('q')?.trim();

  let limit = Number(url.searchParams.get('limit'));

  if (!Number.isInteger(limit) || limit < 1) {
    limit = 10;
  }

  if (limit > 20) {
    limit = 20;
  }

  if (!q) {
    throw new Error('Falta el parámetro q');
  }

  if (!env.YTSEARCH_URL) {
    throw new Error('YTSEARCH_URL no está configurada');
  }

  const api =
    `${env.YTSEARCH_URL}?q=${encodeURIComponent(q)}&limit=${limit}`;

  const response = await fetch(api);

  if (!response.ok) {
    throw new Error(
      `SaitamaYT respondió HTTP ${response.status}`
    );
  }

  const data = await response.json();

  return {
    status: true,
    creator: 'ֆǟɨ',
    query: q,
    limit,
    total: data.total || data.results?.length || 0,
    results: data.results || []
  };
}
