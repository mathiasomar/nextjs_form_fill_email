"use client";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";

/** Touch / stylus / mouse signature box. Emits a PNG data URL (or "" when cleared). */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const pos = (clientX: number, clientY: number) => {
    const c = ref.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    const style = getComputedStyle(c);
    const borderX = parseFloat(style.borderLeftWidth);
    const borderY = parseFloat(style.borderTopWidth);
    const width = r.width - borderX - parseFloat(style.borderRightWidth);
    const height = r.height - borderY - parseFloat(style.borderBottomWidth);
    return {
      x: ((clientX - r.left - borderX) * c.width) / width,
      y: ((clientY - r.top - borderY) * c.height) / height,
    };
  };
  const ctx = () => {
    const g = ref.current?.getContext("2d");
    if (!g) return null;
    g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#17231d";
    return g;
  };
  const pointFrom = (e: ReactPointerEvent<HTMLCanvasElement>) => pos(e.clientX, e.clientY);
  const drawTo = (point: { x: number; y: number }) => {
    const g = ctx();
    const previous = lastPoint.current;
    if (!g || !previous) return;
    const mid = { x: (previous.x + point.x) / 2, y: (previous.y + point.y) / 2 };
    g.quadraticCurveTo(previous.x, previous.y, mid.x, mid.y);
    g.stroke();
    g.beginPath();
    g.moveTo(mid.x, mid.y);
    lastPoint.current = point;
  };
  const finish = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || e.pointerId !== activePointerId.current) return;
    if (e.type === "pointerup") drawTo(pointFrom(e));
    drawing.current = false;
    activePointerId.current = null;
    lastPoint.current = null;
    if (ref.current) onChange(ref.current.toDataURL("image/png"));
  };

  return (
    <>
      <canvas
        ref={ref} width={900} height={300} className="signature-pad" aria-label="Member signature box"
        onPointerDown={(e) => {
          if (!e.isPrimary || drawing.current || (e.pointerType === "mouse" && e.button !== 0)) return;
          const p = pointFrom(e), g = ctx();
          if (!g) return;
          drawing.current = true;
          activePointerId.current = e.pointerId;
          lastPoint.current = p;
          e.currentTarget.setPointerCapture(e.pointerId);
          g.beginPath();
          g.arc(p.x, p.y, g.lineWidth / 2, 0, Math.PI * 2);
          g.fillStyle = g.strokeStyle;
          g.fill();
          g.beginPath();
          g.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || e.pointerId !== activePointerId.current) return;
          const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
          for (const event of events) drawTo(pos(event.clientX, event.clientY));
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      />
      <button type="button" className="btn secondary" onClick={() => {
        const c = ref.current!;
        c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
        drawing.current = false;
        activePointerId.current = null;
        lastPoint.current = null;
        onChange("");
      }}>
        Clear signature
      </button>
    </>
  );
}
