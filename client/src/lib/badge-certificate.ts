/** Kinetic Fitness certificate export: lightweight canvas rendering produces a shareable PNG without external services. */
import type { Achievement } from "@/lib/rewards-data";

export function exportBadgeCertificate(achievement: Achievement) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600; canvas.height = 900;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const lime = "#c9ad7e", bone = "#edf4e9", smoke = "#9eab9c", slate = "#111811";
  ctx.fillStyle = "#ece1cc"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(217,168,106,.13)"; ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.strokeStyle = lime; ctx.globalAlpha = .72; ctx.lineWidth = 3; ctx.strokeRect(62, 62, 1476, 776); ctx.globalAlpha = 1;
  ctx.fillStyle = "#121d13"; ctx.fillRect(104, 112, 278, 278); ctx.strokeStyle = lime; ctx.lineWidth = 7; ctx.strokeRect(104, 112, 278, 278);
  const px = (x: number, y: number, w: number, h: number, color = lime) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  px(178, 170, 50, 50); px(228, 170, 50, 50); px(278, 170, 50, 50, "#9eca77"); px(178, 220, 50, 50); px(278, 220, 50, 50); px(228, 270, 50, 50, "#dff5cf"); px(252, 320, 24, 35, "#c9ad7e");
  ctx.font = "bold 29px monospace"; ctx.fillStyle = lime; ctx.fillText("FITTRACK / PERFORMANCE CERTIFICATE", 454, 159);
  ctx.font = "18px monospace"; ctx.fillStyle = smoke; ctx.fillText("ATHLETE SIGNAL ARCHIVE · VERIFIED MILESTONE", 456, 204);
  ctx.font = "bold 102px sans-serif"; ctx.fillStyle = bone; ctx.fillText(achievement.title.toUpperCase(), 454, 334);
  ctx.font = "27px sans-serif"; ctx.fillStyle = smoke; const words = achievement.description.split(" "); let line = ""; let y = 393; for (const word of words) { const test = `${line}${word} `; if (ctx.measureText(test).width > 950) { ctx.fillText(line, 456, y); y += 40; line = `${word} `; } else line = test; } ctx.fillText(line, 456, y);
  ctx.fillStyle = "#152416"; ctx.fillRect(104, 520, 1392, 175); ctx.fillStyle = lime; ctx.fillRect(104, 520, 10, 175);
  ctx.font = "16px monospace"; ctx.fillStyle = smoke; ctx.fillText("REWARD", 148, 570); ctx.fillText("ACHIEVEMENT VALUE", 530, 570); ctx.fillText("ARCHIVE STATUS", 1030, 570);
  ctx.font = "bold 35px sans-serif"; ctx.fillStyle = bone; ctx.fillText(achievement.reward.toUpperCase(), 148, 626); ctx.fillText(`${achievement.progress.toLocaleString()} / ${achievement.target.toLocaleString()}`, 530, 626); ctx.fillStyle = lime; ctx.fillText("UNLOCKED", 1030, 626);
  ctx.font = "16px monospace"; ctx.fillStyle = smoke; ctx.fillText("TRAIN THE SYSTEM. SEE THE SIGNAL.", 104, 773); ctx.fillText(`ISSUED · ${new Date().toLocaleDateString().toUpperCase()}`, 1120, 773);
  canvas.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `fittrack-${achievement.id}-certificate.png`; anchor.click(); URL.revokeObjectURL(url); }, "image/png");
}
