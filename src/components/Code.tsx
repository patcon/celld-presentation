import { useEffect, useState } from "react";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { ShikiMagicMoveRenderer } from "@shikijs/magic-move/react";
import { codeToKeyedTokens, syncTokenKeys, toKeyedTokens } from "@shikijs/magic-move/core";
import type { KeyedTokensInfo } from "@shikijs/magic-move/types";
import "@shikijs/magic-move/style.css";

export type Lang = "ts" | "jsonc";

const THEMES = { light: "github-light", dark: "github-dark" };

// Started on import, so it's usually ready before the first code slide.
let loaded: HighlighterCore | undefined;
const loading = createHighlighterCore({
  themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
  langs: [import("shiki/langs/typescript.mjs"), import("shiki/langs/jsonc.mjs")],
  engine: createJavaScriptRegexEngine(),
}).then((h) => (loaded = h));

function useHighlighter() {
  const [highlighter, setHighlighter] = useState(loaded);
  useEffect(() => {
    if (!highlighter) loading.then(setHighlighter);
  }, [highlighter]);
  return highlighter;
}

// Shiki's notation markers, at the end of a line: `// [!code ++]`, `--`, `focus` or `highlight`.
// Magic Move doesn't run Shiki transformers, so we strip them ourselves and style the tokens.
const MARKER = /\s*\/\/\s*\[!code (\+\+|--|focus|highlight)\]\s*$/;
type Mark = "++" | "--" | "focus" | "highlight";

function parse(source: string) {
  const marks: (Mark | undefined)[] = [];
  const lines = source.replace(/\n$/, "").split("\n").map((line) => {
    const match = line.match(MARKER);
    marks.push(match?.[1] as Mark | undefined);
    return match ? line.slice(0, match.index) : line;
  });
  return { code: lines.join("\n"), marks };
}

const LINE_BG: Partial<Record<Mark, string>> = {
  "++": "var(--code-add)",
  "--": "var(--code-remove)",
  highlight: "var(--code-highlight)",
};
const GUTTER: Partial<Record<Mark, string>> = { "++": '"+"', "--": '"-"' };

function tokenize(highlighter: HighlighterCore, source: string, lang: Lang): KeyedTokensInfo {
  const { code, marks } = parse(source);
  const info = codeToKeyedTokens(highlighter, code, { lang, themes: THEMES, defaultColor: false });
  const focusing = marks.includes("focus");
  let line = 0;
  let lineStart = true;
  const tokens = info.tokens.map((token) => {
    if (token.content === "\n") {
      line++;
      lineStart = true;
      return token;
    }
    const mark = marks[line];
    // Every token gets every property: the renderer only ever sets styles, never clears them.
    const style = {
      ...(token.htmlStyle as Record<string, string>),
      "--line-bg": (mark && LINE_BG[mark]) ?? "transparent",
      "--dim": focusing && mark !== "focus" ? "0.3" : "1",
      "--gutter": (lineStart && mark && GUTTER[mark]) || '""',
    };
    lineStart = false;
    return { ...token, htmlStyle: style };
  });
  return { ...info, tokens };
}

const EMPTY = toKeyedTokens("", []);
const DURATION = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 800;

// A code block that animates to its new contents whenever `code` changes.
// Consecutive slides that each render a <Code> reuse the same instance,
// so stepping through them moves the tokens rather than swapping the block.
export function Code({ code, lang, file }: { code: string; lang: Lang; file?: string }) {
  const highlighter = useHighlighter();
  const [step, setStep] = useState<{ code: string; lang: Lang; from: KeyedTokensInfo; to: KeyedTokensInfo }>();

  // Derived during render (not in an effect) so the new tokens paint in the same frame.
  if (highlighter && (step?.code !== code || step.lang !== lang)) {
    const { from, to } = syncTokenKeys(step?.to ?? EMPTY, tokenize(highlighter, code, lang));
    setStep({ code, lang, from, to });
  }

  return (
    <figure className="code-slide">
      {file && <figcaption>{file}</figcaption>}
      {step && <ShikiMagicMoveRenderer tokens={step.to} previous={step.from} options={{ duration: DURATION }} />}
    </figure>
  );
}
