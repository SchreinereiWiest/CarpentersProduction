/** Verteilt Geldbeträge in ganzen Cent nach positiven Gewichten; größte Reste erhalten die verbliebenen Cent. */
export function distribute(amount, weights) {
  const usable = weights.filter((item) => Number(item.weight) > 0);
  const sum = usable.reduce((total, item) => total + Number(item.weight), 0);
  if (!sum) return {};
  const cents = Math.round(Math.abs(amount) * 100);
  const sign = Math.sign(amount);
  const shares = usable.map((item) => {
    const exact = (cents * Number(item.weight)) / sum;
    return {
      id: item.id,
      cents: Math.floor(exact),
      remainder: exact - Math.floor(exact)
    };
  });
  let remainder = cents - shares.reduce((total, item) => total + item.cents, 0);
  for (const item of [...shares].sort((a, b) => b.remainder - a.remainder)) {
    if (remainder-- > 0) item.cents++;
  }
  return Object.fromEntries(
    shares.map((item) => [item.id, (sign * item.cents) / 100])
  );
}
