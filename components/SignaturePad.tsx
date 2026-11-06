"use client";
import { useRef } from "react";

/** Touch / stylus / mouse signature box. Emits a PNG data URL (or "" when cleared). */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };
  const ctx = () => {
    const g = ref.current!.getContext("2d")!;
    g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#17231d";
    return g;
  };

  return (
    <>
      <canvas
        ref={ref} width={900} height={300} className="signature-pad" aria-label="Member signature box"
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = pos(e), g = ctx();
          g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + 0.1, p.y); g.stroke();
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = pos(e), g = ctx();
          g.lineTo(p.x, p.y); g.stroke();
        }}
        onPointerUp={() => { drawing.current = false; onChange(ref.current!.toDataURL("image/png")); }}
        onPointerCancel={() => { drawing.current = false; onChange(ref.current!.toDataURL("image/png")); }}
      />
      <button type="button" className="btn secondary" onClick={() => {
        const c = ref.current!;
        c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
        onChange("");
      }}>
        Clear signature
      </button>
    </>
  );
}
