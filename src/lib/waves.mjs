// Run async tasks in WAVES of a fixed width (concurrency cap). Learned the hard way: firing dozens of heavy LLM
// agents at once overruns rate limits and stalls the whole run — small waves are slower but reliable.
// tasks: array of () => Promise<T>.  onWave(i,total): optional progress callback. Returns results in order (nulls on throw).
export async function waves(tasks, width = 3, onWave) {
  const out = [];
  const total = Math.ceil(tasks.length / width);
  for (let i = 0; i < tasks.length; i += width) {
    const wave = tasks.slice(i, i + width);
    if (onWave) onWave(Math.floor(i / width) + 1, total);
    const rs = await Promise.all(wave.map((t) => t().catch(() => null)));
    out.push(...rs);
  }
  return out;
}

// chunk a long string into pieces of ~size chars (for LLM context windows)
export const chunk = (t, size = 12000) => {
  const out = [];
  for (let i = 0; i < t.length; i += size) out.push(t.slice(i, i + size));
  return out;
};
