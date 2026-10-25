export const normalizeTag = (name: string) => name.trim().replace(/^#/, "").replace(/\s+/g, " ").toLowerCase().slice(0, 40);
