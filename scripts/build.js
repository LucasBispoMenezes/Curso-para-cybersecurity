import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import hljs from "highlight.js";

const ROOT = "cursos";
const OUT = "public";

marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? walk(full) : full.endsWith(".md") ? [full] : [];
    });
}

const cursos = [];

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const dir = path.join(ROOT, entry.name);
  const files = walk(dir).sort();

  const aulas = files.map((file) => {
    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = matter(raw);
    const rel = path.relative(dir, file).replace(/\\/g, "/");
    const nome = path.basename(file, ".md");

    // 00-index.md vira a capa do curso
    const isIndex = nome === "00-index";

    return {
      slug: slugify(nome.replace(/^\d+-/, "")),
      title: data.title || nome.replace(/^\d+-/, "").replace(/-/g, " "),
      order: data.order ?? Number(nome.match(/^\d+/)?.[0] ?? 999),
      isIndex,
      path: rel,
      html: marked.parse(content),
      raw: content,
    };
  });

  const index = aulas.find((a) => a.isIndex);
  const lista = aulas
    .filter((a) => !a.isIndex)
    .sort((a, b) => a.order - b.order);

  cursos.push({
    slug: slugify(entry.name.replace(/^\d+-/, "")),
    folder: entry.name,
    title: index?.title || entry.name.replace(/^\d+-/, "").replace(/-/g, " "),
    description: index ? index.raw.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.trim() || "" : "",
    aulas: lista.map((a) => ({ slug: a.slug, title: a.title, html: a.html })),
  });
}

cursos.sort((a, b) => a.folder.localeCompare(b.folder));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "cursos.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), cursos }, null, 2)
);

console.log(`✅ ${cursos.length} curso(s), ${cursos.reduce((n, c) => n + c.aulas.length, 0)} aula(s)`);
