const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBn(num: number): string {
  const formatted = Math.round(num).toLocaleString('en-US');
  return formatted.replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]);
}

export function toBnRaw(num: number): string {
  return String(Math.round(num)).replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]);
}
