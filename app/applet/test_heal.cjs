const ts = require("typescript");

function healTsx(code) {
  if (!code) return "";
  let healed = code;

  // 1. Remove lone lines with only ellipsis placeholders:
  healed = healed.replace(/^[ \t]*\.\.\.[^\r\n]*$/gm, "");
  healed = healed.replace(/^[ \t]*\{\s*\.\.\.\s*\}[^\r\n]*$/gm, "");
  healed = healed.replace(/,\s*\.\.\.(?=\s*[\}\]])/g, "");
  healed = healed.replace(/(<[A-Za-z0-9_.-]+[^>]*?)\s+\.\.\.(?=\s*[\/>])/g, "$1");
  healed = healed.replace(/(<[A-Za-z0-9_.-]+[^>]*?)\s*\{\s*\.\.\.\s*\}([^>]*>)/g, "$1$2");

  // 2. Remove comments inside return ( ... ) completely (except USER EDITABLE TRANSFORM CONTAINER)
  const returnIdx = healed.indexOf("return (");
  if (returnIdx !== -1) {
    const beforeReturn = healed.slice(0, returnIdx);
    let afterReturn = healed.slice(returnIdx);

    // Strip JSX comments inside return block except the editable transform container anchor:
    afterReturn = afterReturn.replace(/\{\/\*[\s\S]*?\*\/\}/g, (match) => {
      if (match.includes("USER EDITABLE TRANSFORM CONTAINER")) return match;
      return "";
    });

    // Strip single-line comments // inside return block:
    afterReturn = afterReturn.replace(/^[ \t]*\/\/[^\r\n]*$/gm, "");

    // Strip multiline comments /* ... */ inside return block:
    afterReturn = afterReturn.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      if (match.includes("USER EDITABLE TRANSFORM CONTAINER")) return match;
      return "";
    });

    healed = beforeReturn + afterReturn;
  }

  // 3. Strip any remaining comments inside JSX opening tags:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\{\/\*[\s\S]*?\*\/\}([^>]*>)/g, "$1$2");
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\/\*[\s\S]*?\*\/([^>]*>)/g, "$1$2");

  // 4. Remove stray `{` at end of line inside opening tags (e.g. `<path {` -> `<path`)
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\s*\{\s*$/gm, "$1");

  // 5. Close unclosed leaf tags before next tag starts:
  healed = healed.replace(/(<(?:path|rect|circle|line|ellipse|polygon|polyline|stop|use|image)\b[^>]*?)(?=\r?\n\s*<[A-Za-z/])/gm, (match) => {
    if (!match.endsWith("/")) {
      return match + " />";
    }
    return match;
  });

  // 6. Generic arrow functions in TSX:
  healed = healed.replace(/\bconst\s+([A-Za-z0-9_]+)\s*=\s*<([A-Z][A-Za-z0-9_]*)\s*>\s*\(/g, "const $1 = <$2,>(");
  healed = healed.replace(/\bconst\s+([A-Za-z0-9_]+)\s*=\s*<([A-Z][A-Za-z0-9_]*)\s+extends\s+([^>]+)>\s*\(/g, "const $1 = <$2 extends $3,>(");

  // 7. Fix unclosed opening tags at end of line with standalone prop:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:[^>]*?))\s+\{(?!\.\.\.)([a-zA-Z0-9_$.]+)\}(?=\s*(?:\r?\n\s*<|\r?\n\s*\/[/>]|\r?\n\s*\)|$))/g, "$1 {...$2} />");

  // 8. Fix unspread JSX props:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\s+\{(?!\.\.\.)([a-zA-Z0-9_$.]+)\}([^>]*>)/g, "$1 {...$2}$3");

  // 9. Fix multiple consecutive dots in spread:
  healed = healed.replace(/\{\s*\.{4,}/g, "{...");

  // 10. Fix empty JSX prop braces:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\s+\{\s*\}([^>]*>)/g, "$1 $2");

  // 11. Fix spaced self-closing tags:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\s*\/\s+>/g, "$1 />");

  // 12. Fix malformed multiline and single-line self-closing tags:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:[^>]*?))\s*\/(?![>*/])(?=\s*(?:\r?\n\s*<|\r?\n\s*\/[/>]|\r?\n\s*\)|$))/g, "$1 />");

  // 13. Fix leaf SVG tags that forgot self-closing slash:
  const leafTags = [
    "circle", "path", "line", "rect", "ellipse", "polygon", "polyline", 
    "stop", "use", "image", "feGaussianBlur", "feDropShadow", "feColorMatrix", 
    "feBlend", "feMergeNode", "feComposite", "feDisplacementMap", "feTurbulence",
    "fePointLight", "feDistantLight", "feSpotLight", "feOffset"
  ];
  for (const tag of leafTags) {
    const regex = new RegExp("<(" + tag + ")\\b([^>]*?)>(?!\\s*<\\/" + tag + ">)", "gi");
    healed = healed.replace(regex, (m, tagName, attrs) => {
      const trimmedAttrs = attrs.trimEnd();
      if (trimmedAttrs.endsWith("/")) return m;
      return "<" + tagName + attrs + " />";
    });
  }

  // 14. Fix raw unescaped > or arrows (->, =>) in JSX text children:
  healed = healed.replace(/(<text\b[^>]*>)([\s\S]*?)(<\/text>)/gi, (full, open, body, close) => {
    const fixedBody = body
      .replace(/->/g, "-&gt;")
      .replace(/=>/g, "=&gt;")
      .replace(/([^=a-zA-Z0-9_\/"'{\&])\s*>\s*([^>"'=])/g, "$1 &gt; $2")
      .replace(/([^=a-zA-Z0-9_\/"'{\&])\s*<\s*([^<"'=a-zA-Z/])/g, "$1 &lt; $2");
    return open + fixedBody + close;
  });

  healed = healed.replace(/(<(?:span|div|p|h[1-6]|tspan)\b[^>]*>)([\s\S]*?)(<\/(?:span|div|p|h[1-6]|tspan)>)/gi, (full, open, body, close) => {
    if (!body.includes("<")) {
      const fixedBody = body
        .replace(/->/g, "-&gt;")
        .replace(/=>/g, "=&gt;")
        .replace(/([^=a-zA-Z0-9_\/"'{\&])\s*>\s*([^>"'=])/g, "$1 &gt; $2")
        .replace(/([^=a-zA-Z0-9_\/"'{\&])\s*<\s*([^<"'=a-zA-Z/])/g, "$1 &lt; $2");
      return open + fixedBody + close;
    }
    return full;
  });

  // 15. Balance unclosed container tags:
  const returnMatch = healed.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;\s*\}/);
  if (returnMatch) {
    const returnBody = returnMatch[1];
    const gOpen = (returnBody.match(/<g\b/g) || []).length;
    const gClose = (returnBody.match(/<\/g>/g) || []).length;
    if (gOpen > gClose) {
      const diff = gOpen - gClose;
      const closingGs = "      " + "</g>\n".repeat(diff);
      healed = healed.replace(/(<\/svg>|<\/AbsoluteFill>)/, closingGs + "$1");
    }

    const svgOpen = (returnBody.match(/<svg\b/g) || []).length;
    const svgClose = (returnBody.match(/<\/svg>/g) || []).length;
    if (svgOpen > svgClose) {
      const diff = svgOpen - svgClose;
      const closingSvgs = "    " + "</svg>\n".repeat(diff);
      healed = healed.replace(/(<\/AbsoluteFill>)/, closingSvgs + "$1");
    }
  }

  // 16. Single-slash comments outside return:
  healed = healed.split("\n").map(line => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("/>") || trimmed.startsWith("/ >")) return line;
    if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/*")) {
      const rest = trimmed.slice(1);
      if (!/\/[gimsuy]*\s*([,;)\].]|$)/.test(rest)) {
        const indent = line.slice(0, line.length - trimmed.length);
        return indent + "//" + rest;
      }
    }
    return line;
  }).join("\n");

  // 17. Dangling division:
  healed = healed.replace(/([a-zA-Z0-9_)\]])\s*\/\s*(?=[;\r\n])/g, "$1 / 1");

  // 18. Clean up extra empty lines:
  healed = healed.replace(/\n{3,}/g, "\n\n");

  return healed;
}

const snippetWithError = `import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export const DURATION = 300;
export const FPS = 30;
export const WIDTH = 3840;
export const HEIGHT = 2160;

export const LuxuriousLiquidGold = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pre-render calculations
  const t = frame / fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#020205" }}>
      <svg width={WIDTH} height={HEIGHT} viewBox={\`0 0 \${WIDTH} \${HEIGHT}\`}>
        <defs>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffea79" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>
        <g>
          {/* USER EDITABLE TRANSFORM CONTAINER */}
          <div style={{ transform: "translate(0px, 0px) scale(1)", width: "100%", height: "100%" }}>
            <path
              d="M 100 100 Q 200 150 300 100"
              fill="url(#gold)" // Golden wing stroke
            />
            <path
              d="M 200 200" fill="red" /* red path */
            />
            <g id="layer2" // sub layer 2
              transform="translate(10, 10)">
              <rect width={100} height={100} fill="blue">
            </g>
            <path {
              {/* > */}
              d="M 200 200 Q 300 250 400 200"
              fill="url(#gold)"
            />
            // ---> Wave Rippling Layer 3 <---
            <path
              d="M 300 300 Q 400 350 500 300"
              fill="url(#gold)"
              ...
            />
            <circle cx={500} cy={500} r={50} fill="gold"
              {/* shimmer point */}
            >
          </div>
        </g>
      </svg>
    </AbsoluteFill>
  );
};`;

const healedResult = healTsx(snippetWithError);
console.log("HEALED RESULT:\n", healedResult);

const sf = ts.createSourceFile("output.tsx", healedResult, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log("ERRORS COUNT:", sf.parseDiagnostics.length);
sf.parseDiagnostics.forEach(d => {
  const { line, character } = sf.getLineAndCharacterOfPosition(d.start);
  console.log(`Line ${line + 1}, Col ${character + 1}: ${d.messageText}`);
});
