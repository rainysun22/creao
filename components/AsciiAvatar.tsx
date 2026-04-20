"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * An abstract ASCII portrait (human silhouette with head shadow).
 * Each row is exactly 50 chars wide, 36 rows tall.
 * Density ramp used in the art: ` . : ; + o % # @`
 */
const BASE_ART: string[] = [
  "                                                  ",
  "                                                  ",
  "                    ..::;;;;;::..                 ",
  "                 .:;+ooo%%%%ooo+;:.               ",
  "               .:+o%#########%%o+;:.              ",
  "              :;o%###@@@@@@@###%o+;.              ",
  "             .;o%##@@@@@@@@@@@##%o+:              ",
  "             :;o%#@@@@@@@@@@@@@#%o+:              ",
  "             :;o%#@@@@@@@@@@@@@#%o+:              ",
  "             .;o%##@@@@@@@@@@@##%o+:              ",
  "              :;o%###@@@@@@@###%o+;.              ",
  "              .;+o%############%o+;.              ",
  "               .:;+o%########%o+;:.               ",
  "                .:;++oo%%%%oo++;:.                ",
  "                  .:;;++oo++;;:.                  ",
  "                   .::;;++;;::.                   ",
  "                    .:;+oo+;:.                    ",
  "                    .;o####o;.                    ",
  "                   :o########o:                   ",
  "                 .;o##########o;.                 ",
  "                .+%############%+.                ",
  "               :o################o:               ",
  "              ;%##################%;              ",
  "             ;%####################%;             ",
  "            +%######################%+            ",
  "           +%########################%+           ",
  "          o%##########################%o          ",
  "         o%############################%o         ",
  "        o%##############################%o        ",
  "       o%################################%o       ",
  "      +%##################################%+      ",
  "     .o####################################o.     ",
  "     :o####################################o:     ",
  "     ;%####################################%;     ",
  "     +%####################################%+     ",
  "     o%####################################%o     ",
];

const RAMP = " .:;+o%#@";

function perturb(row: string, strength = 3): string {
  const chars = row.split("");
  const indices: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== " ") indices.push(i);
  }
  if (indices.length === 0) return row;
  for (let n = 0; n < strength; n++) {
    const idx = indices[Math.floor(Math.random() * indices.length)];
    const current = chars[idx];
    const pos = RAMP.indexOf(current);
    if (pos === -1) continue;
    const delta = Math.random() < 0.5 ? -1 : 1;
    const next = Math.max(1, Math.min(RAMP.length - 1, pos + delta));
    chars[idx] = RAMP[next];
  }
  return chars.join("");
}

export default function AsciiAvatar() {
  const base = useMemo(() => BASE_ART, []);
  const [art, setArt] = useState<string[]>(base);

  useEffect(() => {
    const id = setInterval(() => {
      // Perturb ~4 random rows each tick to create flicker.
      setArt((prev) => {
        const next = [...prev];
        for (let k = 0; k < 4; k++) {
          const r = Math.floor(Math.random() * next.length);
          next[r] = perturb(base[r], 2);
        }
        return next;
      });
    }, 220);
    return () => clearInterval(id);
  }, [base]);

  return (
    <div className="flex justify-center select-none pointer-events-none">
      <pre
        className="ascii-shiver text-ink-muted"
        style={{
          fontSize: "7px",
          lineHeight: "1",
          letterSpacing: "0px",
          color: "#666",
          margin: 0,
          whiteSpace: "pre",
        }}
      >
        {art.join("\n")}
      </pre>
    </div>
  );
}
