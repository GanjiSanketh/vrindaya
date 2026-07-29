export function buildContent(prompt: string, images?: string[]): string | Record<string, unknown>[] {
  if (!images?.length) return prompt;
  return [{ type: 'text', text: prompt }, ...images.map(url => ({ type: 'image_url', image_url: { url } }))];
}
