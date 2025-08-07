export type OtdItem = { year?: number; text?: string; pages?: { normalizedtitle?: string }[] };

const STOP = new Set([
  'THE','OF','AND','IN','ON','AT','TO','A','AN','FOR','WITH','BY','FROM','OR','AS','IS',
  'UNITED','STATES','KINGDOM','REPUBLIC'
]);

export function extractKeywords(otd: any, max = 14) {
  const buckets: string[] = [];
  const pickFrom = [
    ...(otd?.events ?? []),
    ...(otd?.births ?? []),
    ...(otd?.deaths ?? []),
    ...(otd?.holidays ?? [])
  ] as OtdItem[];

  for (const item of pickFrom) {
    const titles = (item.pages ?? []).map(p => (p.normalizedtitle ?? '').toUpperCase());
    const fromTitles = titles.flatMap(t => splitTitle(t));
    const fromText = splitTitle((item.text ?? '').toUpperCase());

    [...fromTitles, ...fromText].forEach(w => {
      if (w.length >= 3 && !STOP.has(w)) buckets.push(w);
    });
  }

  const uniq = Array.from(new Set(buckets)).sort((a,b) => b.length - a.length);
  return uniq.slice(0, max);
}

function splitTitle(t: string) {
  return t.replace(/[^A-Z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
}
