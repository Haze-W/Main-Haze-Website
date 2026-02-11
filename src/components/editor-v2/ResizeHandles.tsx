"use client";

const HANDLES: Array<{
  id: string;
  cursor: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  w: number;
  h: number;
  mleft?: number;
  mtop?: number;
}> = [
  { id: "n", cursor: "n-resize", top: "-4px", left: "50%", w: 12, h: 8, mleft: -6 },
  { id: "s", cursor: "s-resize", bottom: "-4px", left: "50%", w: 12, h: 8, mleft: -6 },
  { id: "e", cursor: "e-resize", right: "-4px", top: "50%", w: 8, h: 12, mtop: -6 },
  { id: "w", cursor: "w-resize", left: "-4px", top: "50%", w: 8, h: 12, mtop: -6 },
  { id: "ne", cursor: "ne-resize", top: "-5px", right: "-5px", w: 10, h: 10 },
  { id: "nw", cursor: "nw-resize", top: "-5px", left: "-5px", w: 10, h: 10 },
  { id: "se", cursor: "se-resize", bottom: "-5px", right: "-5px", w: 10, h: 10 },
  { id: "sw", cursor: "sw-resize", bottom: "-5px", left: "-5px", w: 10, h: 10 },
];

interface ResizeHandlesProps {
  onResizeStart: (handle: string) => (e: React.PointerEvent) => void;
}

export function ResizeHandles({ onResizeStart }: ResizeHandlesProps) {
  return (
    <>
      {HANDLES.map((h) => (
        <div
          key={h.id}
          role="presentation"
          onPointerDown={onResizeStart(h.id)}
          style={{
            position: "absolute",
            top: h.top,
            bottom: h.bottom,
            left: h.left,
            right: h.right,
            width: h.w,
            height: h.h,
            marginLeft: h.mleft ?? (h.left === "50%" ? -h.w / 2 : undefined),
            marginTop: h.mtop ?? (h.top === "50%" ? -h.h / 2 : undefined),
            cursor: h.cursor,
            background: "var(--accent)",
            borderRadius: 2,
            zIndex: 10,
          }}
        />
      ))}
    </>
  );
}
