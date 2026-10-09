import express from 'express';
import { execFile } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3000;

function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '0seg';

  seconds = Math.floor(Number(seconds));

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min ${String(secs).padStart(2, '0')}seg`;
  }

  return `${minutes}min ${String(secs).padStart(2, '0')}seg`;
}

function formatViews(views) {
  if (views == null) return '0';

  views = Number(views);

  if (views >= 1_000_000_000) {
    return `${(views / 1_000_000_000).toFixed(1)}B`;
  }

  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`;
  }

  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K`;
  }

  return String(views);
}

app.get('/ytsearch', (req, res) => {
  const q = String(req.query.q || '').trim();

  let limit = Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  if (limit > 20) limit = 20;

  if (!q) {
    return res.status(400).json({
      status: false,
      error: 'Falta el parámetro q'
    });
  }

  execFile(
    'yt-dlp',
    [
      `ytsearch${limit}:${q}`,
      '--flat-playlist',
      '--dump-single-json',
      '--no-warnings',
      '--skip-download'
    ],
    {
      timeout: 30000,
      maxBuffer: 20 * 1024 * 1024
    },
    (error, stdout) => {

      if (error) {
        return res.status(500).json({
          status: false,
          error: 'yt-dlp no pudo realizar la búsqueda'
        });
      }

      try {
        const data = JSON.parse(stdout);

        const results = (data.entries || []).map((video, index) => ({
          position: index + 1,
          id: video.id || null,
          title: video.title || null,
          url: video.webpage_url ||
            `https://www.youtube.com/watch?v=${video.id}`,
          channel: video.channel ||
            video.uploader ||
            null,
          duration: formatDuration(video.duration),
          views: formatViews(video.view_count),
          thumbnail:
            video.thumbnail ||
            `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
        }));

        const output = {
          status: true,
          query: q,
          limit,
          total: results.length,
          results
        };

        return res
          .status(200)
          .type('json')
          .send(JSON.stringify(output, null, 2));

      } catch {
        return res.status(500).json({
          status: false,
          error: 'Respuesta inválida de yt-dlp'
        });
      }
    }
  );
});

app.listen(PORT, () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   SaitamaYT • YouTube Search');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Puerto: ' + PORT);
  console.log('   Resultados por defecto: 10');
  console.log('   Máximo: 20');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});
