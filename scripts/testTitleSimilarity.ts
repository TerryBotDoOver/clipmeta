// Quick sanity test of titleSimilarity against the Helton Gudauri cluster.
// Run with:  npx tsx scripts/testTitleSimilarity.ts
// Kept out of /src so it doesn't ship with the production build.

import {
  similarityScore,
  findWorstClash,
  extractOpening,
  extractTemplate,
  buildDiversityDirective,
} from "../src/lib/titleSimilarity";

const HELTON_CLUSTER = [
  "Lone Skier Traversing Snowy Mountain Ridge at Dawn in Gudauri",
  "Climbers on Steep Snowy Ridge Under Dramatic Skies in Gudauri",
  "Lone Skier Ascending Snowy Slope Against Pastel Skies in Gudauri",
  "Lone Figure Contemplating Expansive Snowy Landscape at Sunset in Gudauri",
  "Solo Hiker Ascending Steep Snowy Slope in Gudauri",
  "Solitary Climber Ascending Steep Snowy Mountain in Gudauri",
  "Skier Ascending Steep Snowy Slope with Equipment in Gudauri",
  "Climber Ascends Steep Snowy Ridge with Gear in Gudauri",
  "Hiker Ascends Snowy Mountain Ridge with Majestic Peaks in Background",
  "Solo Traveler Ascending Snowy Mountain at Sunrise in Gudauri",
];

function pad(s: string, n: number): string {
  return (s + " ".repeat(n)).slice(0, n);
}

console.log("=== Pairwise similarity matrix (>= 0.60 flagged with *) ===\n");
const header = "     " + HELTON_CLUSTER.map((_, j) => pad(String(j + 1), 6)).join("");
console.log(header);
const triggered: Array<{ i: number; j: number; score: number }> = [];
for (let i = 0; i < HELTON_CLUSTER.length; i++) {
  const row: string[] = [];
  for (let j = 0; j < HELTON_CLUSTER.length; j++) {
    if (i === j) {
      row.push(pad("-", 6));
    } else {
      const s = similarityScore(HELTON_CLUSTER[i], HELTON_CLUSTER[j]);
      const marker = s >= 0.6 ? "*" : " ";
      row.push(pad(s.toFixed(2) + marker, 6));
      if (j > i && s >= 0.6) triggered.push({ i, j, score: s });
    }
  }
  console.log(pad(String(i + 1) + ":", 5) + row.join(""));
}

console.log("\n=== Pairs that would trigger regeneration (score >= 0.60) ===\n");
for (const t of triggered.sort((a, b) => b.score - a.score)) {
  console.log(`  [${(t.i + 1).toString().padStart(2, " ")} <-> ${(t.j + 1).toString().padStart(2, " ")}]  ${t.score.toFixed(2)}`);
  console.log(`    A: "${HELTON_CLUSTER[t.i]}"`);
  console.log(`    B: "${HELTON_CLUSTER[t.j]}"`);
  console.log("");
}

console.log(`Total clashes flagged: ${triggered.length} out of ${(HELTON_CLUSTER.length * (HELTON_CLUSTER.length - 1)) / 2} possible pairs`);

console.log("\n=== findWorstClash simulation (generated in order, each checked vs all prior) ===\n");
for (let i = 1; i < HELTON_CLUSTER.length; i++) {
  const candidate = HELTON_CLUSTER[i];
  const prior = HELTON_CLUSTER.slice(0, i);
  const clash = findWorstClash(candidate, prior, 0.6);
  if (clash) {
    console.log(`Clip ${i + 1}: WOULD REGEN (score ${clash.score.toFixed(2)})`);
    console.log(`  Candidate:    "${candidate}"`);
    console.log(`  Clashes with: "${clash.existingTitle}"`);
    console.log(`  (opening=${clash.opening.toFixed(2)} bigram=${clash.bigram.toFixed(2)} template=${clash.template.toFixed(2)} suffix=${clash.suffix.toFixed(2)})`);
  } else {
    console.log(`Clip ${i + 1}: ok  "${candidate}"`);
  }
}

console.log("\n=== Opening / template extraction sanity check ===\n");
for (const t of HELTON_CLUSTER.slice(0, 5)) {
  console.log(`  "${t}"`);
  console.log(`    opening:  [${extractOpening(t).join(", ")}]`);
  console.log(`    template: ${extractTemplate(t)}`);
}

console.log("\n=== buildDiversityDirective sample (after 5 prior titles) ===\n");
console.log(buildDiversityDirective(HELTON_CLUSTER.slice(0, 5)));
