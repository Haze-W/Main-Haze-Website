/**
 * Export SceneNodes to HTML - 1:1 with Haze editor display.
 * Preserves Figma styling: colors, images, vectors, text.
 * Exports TOPBAR nodes as real frameless title bars with drag region.
 */

import type { SceneNode } from "./types";
import { hexAlpha, paintToSolidColor } from "@/lib/figma/types";
import type { Paint, Effect, TextSegment } from "@/lib/figma/types";
import type { TopBarConfig, InteractionList, Block, HoverPreset } from "./blocks";

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function resolveGradientStops(fill: Paint): Array<{ hex: string; alpha: number; position: number }> | null {
  if (fill.stops && fill.stops.length >= 2) {
    return fill.stops.filter((s) => s.hex != null).map((s) => ({ hex: s.hex!, alpha: s.alpha ?? 1, position: s.position ?? 0 }));
  }
  if (fill.gradientStops && fill.gradientStops.length >= 2) {
    return fill.gradientStops.map((gs) => ({
      hex: rgbToHex(gs.color.r, gs.color.g, gs.color.b),
      alpha: gs.color.a ?? 1,
      position: gs.position,
    }));
  }
  return null;
}

function computeGradientAngle(handles?: Array<{ x: number; y: number }>): number {
  if (!handles || handles.length < 2) return 180;
  const [start, end] = handles;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angleRad = Math.atan2(dy, dx);
  return Math.round((angleRad * 180) / Math.PI + 90);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getFillAlpha(fill: Paint): number {
  if (fill.alpha != null) return fill.alpha;
  if (fill.opacity != null) return fill.opacity;
  const c = fill.color as { a?: number } | undefined;
  if (c && typeof c.a === "number") return c.a;
  return 1;
}

function isFillVisible(fill: Paint): boolean {
  if (fill.transparent === true) return false;
  if (fill.visible === false) return false;
  if (getFillAlpha(fill) === 0) return false;
  return true;
}

function getBackground(fills: Paint[], fillEnabled: boolean, isTextNode: boolean): string | undefined {
  if (isTextNode) return undefined;
  if (!fillEnabled || !fills || fills.length === 0) return undefined;
  for (const fill of fills) {
    if (!isFillVisible(fill)) continue;
    if (!fill.type || fill.type === "SOLID") {
      const solid = paintToSolidColor(fill);
      if (solid) return solid;
      if (fill.hex) return hexAlpha(fill.hex, getFillAlpha(fill));
    }
    if (fill.type === "GRADIENT_LINEAR") {
      const resolvedStops = resolveGradientStops(fill);
      if (resolvedStops && resolvedStops.length >= 2) {
        const angle = computeGradientAngle(fill.gradientHandlePositions);
        const stopsStr = resolvedStops
          .map((s) => `${hexAlpha(s.hex, s.alpha)} ${Math.round(s.position * 100)}%`)
          .join(", ");
        return `linear-gradient(${angle}deg, ${stopsStr})`;
      }
    }
  }
  return undefined;
}

function getBorder(strokes: Paint[], strokeWeight: number, strokeEnabled: boolean): string | undefined {
  if (!strokeEnabled || !strokes || strokes.length === 0 || strokeWeight === 0) return undefined;
  const stroke = strokes[0];
  if (!isFillVisible(stroke)) return undefined;
  const color = paintToSolidColor(stroke) ?? (stroke.hex ? hexAlpha(stroke.hex, getFillAlpha(stroke)) : undefined);
  if (!color) return undefined;
  return `${strokeWeight}px solid ${color}`;
}

function getBorderRadius(f: { cornerRadius: number | null; topLeftRadius?: number | null; topRightRadius?: number | null; bottomLeftRadius?: number | null; bottomRightRadius?: number | null }, isEllipse: boolean): string | undefined {
  if (isEllipse) return "50%";
  const { topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius, cornerRadius } = f;
  if (topLeftRadius != null || topRightRadius != null || bottomRightRadius != null || bottomLeftRadius != null) {
    const tl = topLeftRadius ?? 0, tr = topRightRadius ?? 0, br = bottomRightRadius ?? 0, bl = bottomLeftRadius ?? 0;
    if (tl === 0 && tr === 0 && br === 0 && bl === 0) return undefined;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }
  if (cornerRadius != null && cornerRadius > 0) return `${cornerRadius}px`;
  return undefined;
}

function getBoxShadow(effects: Effect[]): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const shadows = effects
    .filter((e) => e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")
    .map((e) => {
      const x = e.x ?? 0, y = e.y ?? 0, blur = e.blur ?? 0, spread = e.spread ?? 0;
      const color = e.color && e.alpha != null ? hexAlpha(e.color, e.alpha) : "rgba(0,0,0,0.25)";
      return `${e.type === "INNER_SHADOW" ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${color}`;
    });
  return shadows.length > 0 ? shadows.join(", ") : undefined;
}

function getFilter(effects: Effect[]): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const blurs = effects.filter((e) => e.type === "LAYER_BLUR");
  if (blurs.length === 0) return undefined;
  return blurs.map((e) => `blur(${e.blur ?? 0}px)`).join(" ");
}

function getTextColor(props: Record<string, unknown>): string {
  const textFills = props._textFills as Paint[] | undefined;
  if (textFills && textFills.length > 0) {
    const tf = textFills[0];
    if (isFillVisible(tf)) {
      const color = paintToSolidColor(tf) ?? (tf.hex ? hexAlpha(tf.hex, getFillAlpha(tf)) : undefined);
      if (color) return color;
    }
  }
  return "#000000";
}

function textSegmentsToHtml(props: Record<string, unknown>): string {
  const segments = props._textSegments as TextSegment[] | undefined;
  const content = (props.content as string) ?? "";
  if (!segments || segments.length <= 1) return escapeHtml(content);
  return segments.map((seg) => {
    const styles: string[] = [];
    if (seg.fontFamily) styles.push(`font-family:"${seg.fontFamily}",sans-serif`);
    if (seg.fontSize) styles.push(`font-size:${seg.fontSize}px`);
    if (seg.fontWeight) styles.push(`font-weight:${seg.fontWeight}`);
    if (seg.fontStyle?.toLowerCase() === "italic") styles.push("font-style:italic");
    if (seg.textDecoration && seg.textDecoration.toLowerCase() !== "none") styles.push(`text-decoration:${seg.textDecoration}`);
    if (seg.letterSpacing != null && seg.letterSpacing !== 0) styles.push(`letter-spacing:${seg.letterSpacing}px`);
    if (seg.fills && seg.fills.length > 0) {
      const sf = seg.fills[0];
      if (isFillVisible(sf)) {
        const color = paintToSolidColor(sf) ?? (sf.hex ? hexAlpha(sf.hex, getFillAlpha(sf)) : undefined);
        if (color) styles.push(`color:${color}`);
      }
    }
    const styleStr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
    return `<span${styleStr}>${escapeHtml(seg.characters)}</span>`;
  }).join("");
}

function mapAlign(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  switch (val) {
    case "MIN": return "flex-start";
    case "MAX": return "flex-end";
    case "CENTER": return "center";
    case "SPACE_BETWEEN": return "space-between";
    default: return undefined;
  }
}

// ── Interaction JS Generator ──────────────────────────────────────────────────

function animBlockToJs(block: Block): string {
  const dur = (block.params?.duration as number) ?? 400;
  const delay = (block.params?.delay as number) ?? 0;
  const ease = (block.params?.easing as string) ?? "cubic-bezier(0.4,0,0.2,1)";
  const dist = (block.params?.distance as number) ?? 24;
  const keyframeMap: Record<string, string> = {
    ANIMATE_PULSE: "rnd-pulse", ANIMATE_SHAKE: "rnd-shake", ANIMATE_BOUNCE: "rnd-bounce",
  };
  const kf = keyframeMap[block.type];
  if (kf) return `(function(el){el.style.animation='none';void el.offsetWidth;el.style.animation='${kf} ${dur}ms ${ease} ${delay}ms 1';})(this);`;
  type AnimSpec = { from: Record<string, string>; to: Record<string, string> };
  const specMap: Record<string, AnimSpec> = {
    ANIMATE_FADE_IN:    { from: { opacity:"0" }, to: { opacity:"1" } },
    ANIMATE_FADE_OUT:   { from: { opacity:"1" }, to: { opacity:"0" } },
    ANIMATE_SLIDE_UP:   { from: { opacity:"0", transform:`translateY(${dist}px)` }, to: { opacity:"1", transform:"translateY(0)" } },
    ANIMATE_SLIDE_DOWN: { from: { opacity:"0", transform:`translateY(-${dist}px)` }, to: { opacity:"1", transform:"translateY(0)" } },
    ANIMATE_SLIDE_LEFT: { from: { opacity:"0", transform:`translateX(${dist}px)` }, to: { opacity:"1", transform:"translateX(0)" } },
    ANIMATE_SLIDE_RIGHT:{ from: { opacity:"0", transform:`translateX(-${dist}px)` }, to: { opacity:"1", transform:"translateX(0)" } },
    ANIMATE_SCALE_UP:   { from: { opacity:"0", transform:"scale(0.85)" }, to: { opacity:"1", transform:"scale(1)" } },
    ANIMATE_SCALE_DOWN: { from: { opacity:"0", transform:"scale(1.15)" }, to: { opacity:"1", transform:"scale(1)" } },
  };
  const spec = specMap[block.type];
  if (!spec) return "";
  const fromStr = Object.entries(spec.from).map(([k,v]) => `el.style['${k}']='${v}'`).join(";");
  const toStr = Object.entries(spec.to).map(([k,v]) => `el.style['${k}']='${v}'`).join(";");
  return `(function(el){${fromStr};el.style.transition='all ${dur}ms ${ease} ${delay}ms';requestAnimationFrame(function(){requestAnimationFrame(function(){${toStr};});});})(this);`;
}

function blockToJs(block: Block): string {
  if (block.type.startsWith("ANIMATE_")) return animBlockToJs(block);
  const p = block.params ?? {};
  switch (block.type) {
    case "NAVIGATE_TO_FRAME": {
      if (!p.targetFrameId) return "";
      const transition = (p.transition as string) ?? "fade";
      return `_renderNavigate('${p.targetFrameId}','${transition}');`;
    }
    case "OPEN_URL": {
      if (!p.url) return "";
      return `var _url="${String(p.url).replace(/"/g, '\\"')}";var _tauri=window.__TAURI_INTERNALS__;if(_tauri&&_tauri.invoke){_tauri.invoke('plugin:shell|open',{path:_url});}else{window.open(_url,'_blank');}`;
    }
    case "SHOW_ELEMENT": {
      if (!p.targetNodeId) return "";
      return `var _el=document.querySelector('[data-node-id="${p.targetNodeId}"]');if(_el){_el.style.display='';}`;
    }
    case "HIDE_ELEMENT": {
      if (!p.targetNodeId) return "";
      return `var _el=document.querySelector('[data-node-id="${p.targetNodeId}"]');if(_el){_el.style.display='none';}`;
    }
    case "TOGGLE_VISIBILITY": {
      if (!p.targetNodeId) return "";
      return `var _el=document.querySelector('[data-node-id="${p.targetNodeId}"]');if(_el){_el.style.display=_el.style.display==='none'?'':'none';}`;
    }
    case "TOGGLE_CHECKED": {
      return `var _el=this.querySelector('input[type=checkbox]')||this;if(_el.type==='checkbox'){_el.checked=!_el.checked;}this.classList.toggle('checked');`;
    }
    case "CLOSE_APP":
      return `var _w=window.__TAURI_INTERNALS__?.getCurrentWindow?.();if(_w){_w.close();}`;
    case "MINIMIZE_WINDOW":
      return `var _w=window.__TAURI_INTERNALS__?.getCurrentWindow?.();if(_w){_w.minimize();}`;
    case "TOGGLE_MAXIMIZE":
      return `var _w=window.__TAURI_INTERNALS__?.getCurrentWindow?.();if(_w){_w.isMaximized().then(function(m){if(m)_w.unmaximize();else _w.maximize();});}`;
    case "SEND_IPC":
    case "TRIGGER_EVENT": {
      const evtName = String(p.ipcEvent ?? "render-event");
      const payload = p.ipcPayload ? String(p.ipcPayload) : "{}";
      return `var _tauri=window.__TAURI_INTERNALS__;if(_tauri&&_tauri.invoke){try{_tauri.invoke('plugin:event|emit',{event:'${evtName}',payload:${payload}});}catch(e){}}window.dispatchEvent(new CustomEvent('${evtName}',{detail:${payload}}));`;
    }
    default: return "";
  }
}

function interactionToAttr(trigger: string, blocks: Block[]): string {
  const js = blocks.map(blockToJs).filter(Boolean).join("");
  if (!js) return "";
  const handler = `(function(event){${js}}).call(this,event)`;
  switch (trigger) {
    case "ON_CLICK":     return `onclick="${escapeHtml(handler)}"`;
    case "ON_HOVER":     return `onmouseenter="${escapeHtml(handler)}"`;
    case "ON_HOVER_END": return `onmouseleave="${escapeHtml(handler)}"`;
    case "ON_CHANGE":    return `onchange="${escapeHtml(handler)}" oninput="${escapeHtml(handler)}"`;
    case "ON_LOAD":      return ""; // handled separately
    default: return "";
  }
}

function getOnLoadJs(node: SceneNode): string {
  const interactions = node.props?._interactions as InteractionList | undefined;
  if (!interactions) return "";
  return interactions
    .filter((ia) => ia.trigger === "ON_LOAD")
    .flatMap((ia) => ia.blocks)
    .map(blockToJs)
    .filter(Boolean)
    .join("");
}

function getInteractionAttrs(node: SceneNode): string {
  const interactions = node.props?._interactions as InteractionList | undefined;
  if (!interactions || interactions.length === 0) return "";
  return interactions
    .map((ia) => interactionToAttr(ia.trigger, ia.blocks))
    .filter(Boolean)
    .join(" ");
}

function getHoverAttr(node: SceneNode): string {
  const preset = node.props?._hoverPreset as string | undefined;
  if (!preset || preset === "none") return "";
  return `data-hover="${preset}"`;
}

interface FigmaProps {
  originalType: string;
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
  strokeAlign: string;
  effects: Effect[];
  cornerRadius: number | null;
  topLeftRadius: number | null;
  topRightRadius: number | null;
  bottomLeftRadius: number | null;
  bottomRightRadius: number | null;
  fillEnabled?: boolean;
  strokeEnabled?: boolean;
  textHasNoBackgroundFill?: boolean;
  clipsContent?: boolean;
}

function nodeToHtml(node: SceneNode, parentLayout: "NONE" | "HORIZONTAL" | "VERTICAL" = "NONE", indent = 0): string {
  if (node.visible === false) return "";
  if (node.type === "TOPBAR") return "";

  const pad = "  ".repeat(indent);
  const figma = node.props?._figma as FigmaProps | undefined;
  const isEllipse = !!node.props?._ellipse;
  const isText = figma?.originalType === "TEXT";
  const hasImageFill = !!node.props?._hasImageFill;
  const isTextNode = isText || figma?.textHasNoBackgroundFill === true;
  const VECTOR_TYPES = ["VECTOR", "STAR", "POLYGON", "LINE", "BOOLEAN_OPERATION", "ELLIPSE"];
  const isVector = figma ? VECTOR_TYPES.includes(figma.originalType) : false;
  const isVectorOrImageWithData = hasImageFill || (isVector && node.props?._imageData);

  const usesFlex = parentLayout === "HORIZONTAL" || parentLayout === "VERTICAL";
  const layout = node.layoutMode ?? "NONE";
  const childLayout = layout !== "NONE" ? layout : "NONE";

  const strokeWeight = figma?.strokeWeight ?? 0;
  const hasStroke = figma?.strokeEnabled !== false && (figma?.strokes?.length ?? 0) > 0 && strokeWeight > 0;
  const isLine = figma?.originalType === "LINE";
  const minDim = hasStroke && isLine ? Math.max(1, strokeWeight) : 0;
  const w = minDim ? Math.max(node.width, minDim) : node.width;
  const h = minDim ? Math.max(node.height, minDim) : node.height;

  const style: Record<string, string> = {
    position: usesFlex ? "relative" : "absolute",
    width: `${w}px`,
    height: `${h}px`,
    boxSizing: "border-box",
  };
  if (!usesFlex) {
    style.left = `${node.x}px`;
    style.top = `${node.y}px`;
  }

  if (node.opacity != null && node.opacity < 1) style.opacity = String(node.opacity);

  // Apply rotation and flip transforms
  const transformParts: string[] = [];
  if (node.rotation) transformParts.push(`rotate(${node.rotation}deg)`);
  if (node.props?.scaleX !== undefined) transformParts.push(`scaleX(${node.props.scaleX})`);
  if (node.props?.scaleY !== undefined) transformParts.push(`scaleY(${node.props.scaleY})`);
  if (transformParts.length) style.transform = transformParts.join(" ");

  if (figma) {
    const fillEnabled = figma.fillEnabled !== false;
    if (!hasImageFill && !isTextNode) {
      const bg = getBackground(figma.fills ?? [], fillEnabled, false);
      if (bg) style.background = bg;
    }
    // Apply stroke/border for all non-vector, non-image nodes
    if (!isVector && !hasImageFill) {
      const strokeEnabled = figma.strokeEnabled !== false;
      const border = getBorder(figma.strokes ?? [], figma.strokeWeight ?? 0, strokeEnabled);
      if (border) style.border = border;
    }
    if (!isVectorOrImageWithData) {
      const shadow = getBoxShadow(figma.effects);
      if (shadow) style.boxShadow = shadow;
    }
    const br = getBorderRadius(figma, isEllipse);
    if (br) style.borderRadius = br;
    const filter = getFilter(figma.effects);
    if (filter) style.filter = filter;
    if (node.overflow === "HIDDEN") style.overflow = "hidden";
    else if (node.overflow === "SCROLL") style.overflow = "auto";
    else if (figma.clipsContent && !isVectorOrImageWithData) style.overflow = "hidden";
    else if (isVectorOrImageWithData) style.overflow = "visible";
  }

  if (layout === "HORIZONTAL" || layout === "VERTICAL") {
    style.display = "flex";
    style.flexDirection = layout === "HORIZONTAL" ? "row" : "column";
    if (node.itemSpacing) style.gap = `${node.itemSpacing}px`;
    if (node.paddingTop) style.paddingTop = `${node.paddingTop}px`;
    if (node.paddingRight) style.paddingRight = `${node.paddingRight}px`;
    if (node.paddingBottom) style.paddingBottom = `${node.paddingBottom}px`;
    if (node.paddingLeft) style.paddingLeft = `${node.paddingLeft}px`;
    const justify = mapAlign(node.primaryAxisAlignItems);
    if (justify) style.justifyContent = justify;
    const align = mapAlign(node.counterAxisAlignItems);
    if (align) style.alignItems = align;
  }

  const styleStr = Object.entries(style)
    .filter(([, v]) => v != null && v !== undefined)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`)
    .join(";");

  const interactionAttrs = getInteractionAttrs(node);
  const hoverAttr = getHoverAttr(node);
  const onLoadJs = getOnLoadJs(node);
  const nodeIdAttr = `data-node-id="${node.id}"`;
  const onLoadAttr = onLoadJs ? `data-onload="${escapeHtml(onLoadJs)}"` : "";
  const previewBehavior = node.props?._previewBehavior as string | undefined;
  const previewAttr = previewBehavior ? `data-chat-role="${escapeHtml(previewBehavior)}"` : "";
  const hasInteraction = !!(interactionAttrs || hoverAttr);
  const cursorStyle = hasInteraction ? "cursor:pointer;" : "";
  const extraAttrs = [nodeIdAttr, interactionAttrs, hoverAttr, onLoadAttr, previewAttr].filter(Boolean).join(" ");

  // TEXT NODE
  if (isText) {
    const props = node.props ?? {};
    const textStyle: Record<string, string> = { ...style, color: getTextColor(props), whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "0", padding: "0" };
    delete textStyle.background;
    delete textStyle.backgroundColor;
    if (props.fontFamily) textStyle.fontFamily = `"${props.fontFamily as string}",sans-serif`;
    if (props.fontSize) textStyle.fontSize = `${props.fontSize}px`;
    if (props.fontWeight) textStyle.fontWeight = String(props.fontWeight);
    if (props.textAlign) textStyle.textAlign = props.textAlign as string;
    if (props.letterSpacing != null) textStyle.letterSpacing = `${props.letterSpacing}px`;
    if (props.textDecoration) textStyle.textDecoration = props.textDecoration as string;
    if (props.fontStyle === "italic") textStyle.fontStyle = "italic";
    const lh = props.lineHeight;
    if (lh != null && lh !== "auto") textStyle.lineHeight = typeof lh === "number" ? `${lh}px` : String(lh);
    const textStyleStr = Object.entries(textStyle).filter(([, v]) => v != null).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(";");
    return `${pad}<div ${extraAttrs} style="${escapeHtml(cursorStyle + textStyleStr)}">${textSegmentsToHtml(props)}</div>`;
  }

  // IMAGE / VECTOR NODE
  if (hasImageFill || (isVector && node.props?._imageData)) {
    const imageData = node.props?._imageData as string | undefined;
    if (imageData) {
      const containerStyle = { ...style, overflow: "visible", border: "none", boxShadow: "none" };
      const containerStr = Object.entries(containerStyle).filter(([, v]) => v != null).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(";");
      const objectFit = imageData.includes("image/svg+xml") ? "fill" : "fill";
      return `${pad}<div ${extraAttrs} style="${escapeHtml(cursorStyle + containerStr)}"><img src="${escapeHtml(imageData)}" alt="${escapeHtml(node.name)}" style="width:100%;height:100%;object-fit:${objectFit};display:block;stroke:none;outline:none;border:none" /></div>`;
    }
  }

  // FRAME / SHAPE / GROUP
  const childHtml = (node.children ?? [])
    .map((c) => nodeToHtml(c, childLayout, indent + 1))
    .filter(Boolean)
    .join("\n");

  // ── Non-Figma component types — render with visible styles ──
  if (!figma) {
    const props = node.props ?? {};
    const variant = (props.variant as string) ?? "";

    // BUTTON
    if (node.type === "BUTTON") {
      const label = (props.label as string) ?? "Button";
      const bg = (props.backgroundColor as string) ||
        (variant === "primary" ? "#5e5ce6" :
         variant === "secondary" ? "#2d2d35" :
         variant === "danger" ? "#dc2626" :
         variant === "outline" ? "transparent" : "#5e5ce6");
      const color = (props.color as string) || "white";
      const border = variant === "outline" ? "border:1px solid rgba(255,255,255,0.2);" : "";
      const btnStyle = `${styleStr};background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;border-radius:6px;${border}`;
      return `${pad}<div ${extraAttrs} style="${escapeHtml(btnStyle)}">${escapeHtml(label)}</div>`;
    }

    // TEXT / HEADING / PARAGRAPH
    if (node.type === "TEXT") {
      const content = (props.content as string) ?? "Text";
      const fontSize = (props.fontSize as number) ?? 14;
      const fontWeight = (props.fontWeight as string) ?? "normal";
      const color = (props.color as string) || "#e6edf3";
      const textAlign = (props.textAlign as string) ?? "left";
      const fontFamily = (props.fontFamily as string) ? `font-family:"${props.fontFamily}",sans-serif;` : "";
      const txtStyle = `${styleStr};color:${color};font-size:${fontSize}px;font-weight:${fontWeight};text-align:${textAlign};${fontFamily}overflow:visible;white-space:pre-wrap;`;
      return `${pad}<div ${extraAttrs} style="${escapeHtml(txtStyle)}">${escapeHtml(content)}</div>`;
    }

    // INPUT — render as real <input> so user can type in preview
    if (node.type === "INPUT") {
      const ph = (props.placeholder as string) ?? "Input";
      const inputType = (props.type as string) === "password" ? "password" : "text";
      const inBg = (props.backgroundColor as string) || "rgba(20,20,24,0.9)";
      const inFg = (props.color as string) || "rgba(255,255,255,0.9)";
      const inRadius = (props.borderRadius as number) ?? 6;
      const bCol = (props.borderColor as string) || "rgba(255,255,255,0.1)";
      const bW = (props.borderWidth as number) ?? 1;
      const inputStyle = `${styleStr};background:${inBg};color:${inFg};font-size:14px;padding:0 12px;border:${bW}px solid ${bCol};border-radius:${inRadius}px;display:flex;align-items:center;`;
      return `${pad}<div ${extraAttrs} style="${escapeHtml(inputStyle)}"><input type="${inputType}" placeholder="${escapeHtml(ph)}" data-node-id="${node.id}" style="width:100%;height:100%;background:transparent;border:none;color:inherit;font:inherit;outline:none;" /></div>`;
    }

    // RECTANGLE
    if (node.type === "RECTANGLE") {
      const bg = (props.backgroundColor as string) || "rgba(50,50,58,0.6)";
      const borderColor = (props.borderColor as string) || "";
      const border = borderColor ? `border:1px solid ${borderColor};` : "";
      const boxShadow = (props.boxShadow as string) || "";
      const rectStyle = `${styleStr};background:${bg};border-radius:${(props.borderRadius as number) ?? 4}px;${border}${boxShadow ? `box-shadow:${boxShadow};` : ""}`;
      return `${pad}<div ${extraAttrs} style="${escapeHtml(rectStyle)}"></div>`;
    }

    // CHECKBOX
    if (node.type === "CHECKBOX") {
      const label = (props.label as string) ?? "";
      const checked = (props.checked as boolean) ?? false;
      const isSwitch = (props.switch as boolean) ?? false;
      if (isSwitch) {
        const trackBg = checked ? "#5e5ce6" : "rgba(255,255,255,0.15)";
        const chkStyle = `${styleStr};display:flex;align-items:center;`;
        return `${pad}<div ${extraAttrs} style="${escapeHtml(chkStyle)}"><div style="width:44px;height:24px;background:${trackBg};border-radius:12px;position:relative;"><div style="position:absolute;top:2px;left:${checked ? "22px" : "2px"};width:20px;height:20px;background:white;border-radius:50%;"></div></div></div>`;
      }
      const boxBg = checked ? "#5e5ce6" : "transparent";
      const boxBorder = checked ? "#5e5ce6" : "rgba(255,255,255,0.3)";
      const chkStyle = `${styleStr};display:flex;align-items:center;gap:8px;color:#e6edf3;font-size:14px;`;
      return `${pad}<div ${extraAttrs} style="${escapeHtml(chkStyle)}"><div style="width:18px;height:18px;border:2px solid ${boxBorder};border-radius:4px;background:${boxBg};display:flex;align-items:center;justify-content:center;color:white;font-size:12px;">${checked ? "✓" : ""}</div>${label ? `<span>${escapeHtml(label)}</span>` : ""}</div>`;
    }

    // SELECT
    if (node.type === "SELECT") {
      const ph = (props.placeholder as string) ?? "Select...";
      const selStyle = `${styleStr};background:rgba(20,20,24,0.9);color:rgba(255,255,255,0.6);font-size:14px;padding:0 12px;border:1px solid rgba(255,255,255,0.1);border-radius:6px;display:flex;align-items:center;justify-content:space-between;`;
      return `${pad}<div ${extraAttrs} style="${escapeHtml(selStyle)}"><span>${escapeHtml(ph)}</span><span style="font-size:10px;">▼</span></div>`;
    }

    // IMAGE
    if (node.type === "IMAGE") {
      const src = (props.src as string) ?? "";
      const rounded = (props.rounded as boolean) ?? false;
      const radius = rounded ? "border-radius:50%;" : "border-radius:6px;";
      const imgStyle = `${styleStr};overflow:hidden;${radius}background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;`;
      if (src) {
        return `${pad}<div ${extraAttrs} style="${escapeHtml(imgStyle)}"><img src="${escapeHtml(src)}" style="width:100%;height:100%;object-fit:cover;" /></div>`;
      }
      return `${pad}<div ${extraAttrs} style="${escapeHtml(imgStyle)}"><span style="font-size:32px;opacity:0.3;">${rounded ? "👤" : "🖼"}</span></div>`;
    }

    // DIVIDER
    if (node.type === "DIVIDER") {
      const divStyle = `position:absolute;left:${node.x}px;top:${node.y}px;width:${node.width}px;height:2px;background:rgba(255,255,255,0.1);`;
      return `${pad}<div ${extraAttrs} style="${escapeHtml(divStyle)}"></div>`;
    }

    // ICON (render as text emoji fallback)
    if (node.type === "ICON") {
      const color = (props.color as string) || "#e6edf3";
      const iconStyle = `${styleStr};display:flex;align-items:center;justify-content:center;color:${color};font-size:${Math.min(node.width, node.height) - 4}px;`;
      return `${pad}<div ${extraAttrs} style="${escapeHtml(iconStyle)}">◆</div>`;
    }

    // FRAME (non-Figma) — must paint background; otherwise preview looks like a flat white sheet
    if (node.type === "FRAME") {
      const bg = (props.backgroundColor as string) || "transparent";
      const radius = (props.borderRadius as number) ?? 0;
      const boxShadow = (props.boxShadow as string) || "";
      const bW = props.borderWidth as number | undefined;
      const bCol = props.borderColor as string | undefined;
      const border =
        bW != null && bCol ? `border:${bW}px solid ${bCol};` : "border:none;";
      const padT = (props.paddingTop as number) ?? (props.padding as number) ?? 0;
      const padR = (props.paddingRight as number) ?? (props.padding as number) ?? 0;
      const padB = (props.paddingBottom as number) ?? (props.padding as number) ?? 0;
      const padL = (props.paddingLeft as number) ?? (props.padding as number) ?? 0;
      const padCss =
        padT || padR || padB || padL ? `padding:${padT}px ${padR}px ${padB}px ${padL}px;` : "";
      const frameStyle = `${styleStr};background:${bg};${radius ? `border-radius:${radius}px;` : ""}${boxShadow ? `box-shadow:${boxShadow};` : ""}${border}${padCss}overflow:hidden;`;
      return `${pad}<div ${extraAttrs} style="${escapeHtml(frameStyle)}">\n${childHtml || ""}\n${pad}</div>`;
    }

    // CONTAINER / PANEL / generic — render background + children
    const bg = (props.backgroundColor as string) || "rgba(25,25,32,0.8)";
    const radius = (props.borderRadius as number) ?? 6;
    const boxShadow = (props.boxShadow as string) || "";
    const isChatMessages = (props._previewBehavior as string) === "chat-messages";
    const overflow = isChatMessages ? "overflow-y:auto;overflow-x:hidden;" : "";
    const padT = (props.paddingTop as number) ?? (props.padding as number) ?? 0;
    const padR = (props.paddingRight as number) ?? (props.padding as number) ?? 0;
    const padB = (props.paddingBottom as number) ?? (props.padding as number) ?? 0;
    const padL = (props.paddingLeft as number) ?? (props.padding as number) ?? 0;
    const padCss =
      padT || padR || padB || padL ? `padding:${padT}px ${padR}px ${padB}px ${padL}px;` : "";
    const bW = props.borderWidth as number | undefined;
    const bCol = props.borderColor as string | undefined;
    const borderExtra =
      bW != null && bCol ? `border:${bW}px solid ${bCol};` : "border:1px solid rgba(255,255,255,0.06);";
    const containerStyle = `${styleStr};background:${bg};border-radius:${radius}px;${borderExtra}${boxShadow ? `box-shadow:${boxShadow};` : ""}${padCss}${overflow}`;
    return `${pad}<div ${extraAttrs} style="${escapeHtml(containerStyle)}">\n${childHtml || ""}\n${pad}</div>`;
  }

  return `${pad}<div ${extraAttrs} style="${escapeHtml(cursorStyle + styleStr)}">\n${childHtml || ""}\n${pad}</div>`;
}

// ── Top Bar Export ────────────────────────────────────────────────────────────

function topBarToHtml(node: SceneNode): string {
  const config = (node.props?._topBarConfig as TopBarConfig | undefined) ?? {
    layout: "windows" as const,
    title: "My Application",
    backgroundColor: "#1c1c1e",
    textColor: "#e0e0e0",
    fontSize: 13,
    fontWeight: "400",
    fontFamily: "Inter, system-ui, sans-serif",
    titleAlign: "left" as const,
    paddingX: 12,
    borderBottom: false,
    borderColor: "#333",
    showIcon: false,
    dragRegion: true,
    buttons: [
      { id: "min", type: "minimize" as const, hoverColor: "rgba(255,255,255,0.1)", blockChain: { id: "min", label: "Minimize", blocks: [] } },
      { id: "max", type: "maximize" as const, hoverColor: "rgba(255,255,255,0.1)", blockChain: { id: "max", label: "Maximize", blocks: [] } },
      { id: "close", type: "close" as const, hoverColor: "#e81123", blockChain: { id: "close", label: "Close", blocks: [] } },
    ],
  };

  const isMac = config.layout === "mac";
  const h = node.height || 32;

  const tbStyle = [
    `height:${h}px`,
    `background:${config.backgroundColor}`,
    `color:${config.textColor}`,
    `font-size:${config.fontSize}px`,
    `font-weight:${config.fontWeight}`,
    `font-family:${config.fontFamily}`,
    "display:flex",
    "align-items:center",
    "flex-shrink:0",
    "user-select:none",
    "-webkit-user-select:none",
    config.borderBottom ? `border-bottom:1px solid ${config.borderColor}` : "",
    isMac ? "justify-content:center" : `padding:0 ${config.paddingX ?? 12}px`,
  ].filter(Boolean).join(";");

  const macControls = `<div style="display:flex;gap:8px;position:absolute;left:12px;top:50%;transform:translateY(-50%);">
    <button data-window-control="close" style="width:12px;height:12px;border-radius:50%;background:#ff5f57;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;"></button>
    <button data-window-control="minimize" style="width:12px;height:12px;border-radius:50%;background:#febc2e;border:none;cursor:pointer;"></button>
    <button data-window-control="maximize" style="width:12px;height:12px;border-radius:50%;background:#28c840;border:none;cursor:pointer;"></button>
  </div>`;

  const winControls = config.buttons.map((btn) => {
    const hoverBg = btn.hoverColor ?? "rgba(255,255,255,0.1)";
    const label = btn.type === "minimize" ? "&#x2212;" : btn.type === "maximize" ? "&#x25A1;" : "&#x2715;";
    const action = btn.type === "minimize" ? "minimize" : btn.type === "maximize" ? "maximize" : "close";
    return `<button data-window-control="${action}" style="width:46px;height:${h}px;border:none;background:transparent;color:${config.textColor};font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='transparent'">${label}</button>`;
  }).join("\n    ");

  const titleSpan = `<span style="font-size:${config.fontSize}px;font-weight:${config.fontWeight};color:${config.textColor};flex:1;text-align:${config.titleAlign ?? "left"};">${escapeHtml(config.title ?? "My Application")}</span>`;

  const inner = isMac
    ? `${macControls}${titleSpan}`
    : `${titleSpan}<div style="display:flex;align-items:center;margin-left:auto;">${winControls}</div>`;

  return `  <div data-tauri-drag-region style="${escapeHtml(tbStyle)};position:relative;" ondblclick="(function(){const w=window.__TAURI_INTERNALS__?.getCurrentWindow?.();if(w)w.isMaximized().then(m=>m?w.unmaximize():w.maximize())})()">
    ${inner}
  </div>`;
}

/**
 * Generate full HTML document from scene nodes.
 * Exports the TOPBAR node as a real frameless title bar.
 * Supports multi-frame navigation via NAVIGATE_TO_FRAME interactions.
 * If no FRAME exists, renders all canvas nodes directly.
 * @param apiBase - Base URL for API calls (e.g. https://yoursite.com). Empty/undefined = relative (same origin).
 */
export function sceneNodesToHtml(nodes: SceneNode[], appName = "Haze App", canvasBg = "#1e1e1e", apiBase = ""): string {
  const frames = nodes.filter((n) => n.type === "FRAME");
  const topBarNode = nodes.find((n) => n.type === "TOPBAR")
    ?? (frames[0]?.children ?? []).find((n) => n.type === "TOPBAR");

  const topBarHtml = topBarNode ? topBarToHtml(topBarNode) : "";

  // No frames — render all canvas nodes directly in a single view
  if (frames.length === 0) {
    const allNodes = nodes.filter((n) => n.type !== "TOPBAR");
    if (allNodes.length === 0) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(appName)}</title><link rel="stylesheet" href="styles.css"></head><body><div style="width:100%;height:100%;background:${canvasBg};display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.2);font-family:sans-serif;font-size:14px;">Add elements to the canvas</div></body></html>`;
    }
    // Offset all nodes so content always starts near top-left (20px padding)
    const minX = Math.min(...allNodes.map((n) => n.x));
    const minY = Math.min(...allNodes.map((n) => n.y));
    const maxX = Math.max(...allNodes.map((n) => n.x + n.width));
    const maxY = Math.max(...allNodes.map((n) => n.y + n.height));
    const pad = 20;
    const offsetNodes = allNodes.map((n) => ({ ...n, x: n.x - minX + pad, y: n.y - minY + pad }));
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const childHtml = offsetNodes.map((n) => nodeToHtml(n, "NONE", 3)).filter(Boolean).join("\n");
    // Wrap in a sized div so absolutely-positioned children affect scroll area
    const wrapStyle = `position:relative;width:${contentW}px;height:${contentH}px;min-width:100%;min-height:100%;`;
    const freeStyle = `width:100%;height:100%;overflow:auto;background:${canvasBg};box-sizing:border-box;`;
    return buildHtml(appName, topBarHtml, `    <div data-frame style="${freeStyle}"><div style="${wrapStyle}">\n${childHtml}\n    </div></div>`, apiBase);
  }

  const rootBg = (() => {
    const figma = frames[0].props?._figma as FigmaProps | undefined;
    if (figma) {
      const bg = getBackground(figma.fills ?? [], figma.fillEnabled !== false, false);
      if (bg) return bg;
    }
    // Use frame's own backgroundColor prop if set
    const frameBg = frames[0].props?.backgroundColor as string | undefined;
    if (frameBg) return frameBg;
    return canvasBg;
  })();

  // Render all frames — first is visible, rest hidden (for navigation)
  const framesHtml = frames.map((f, idx) => {
    const fFigma = f.props?._figma as FigmaProps | undefined;
    let fBg = rootBg;
    if (fFigma) {
      const bg = getBackground(fFigma.fills ?? [], fFigma.fillEnabled !== false, false);
      if (bg) fBg = bg;
    } else if (f.props?.backgroundColor) {
      fBg = f.props.backgroundColor as string;
    }
    const display = idx === 0 ? "block" : "none";
    const fStyle = `width:100%;height:100%;overflow:auto;background:${fBg};box-sizing:border-box;display:${display};`;
    // Children coords are relative to the frame — use frame dimensions as container size
    const wrapStyle = `position:relative;width:${f.width}px;height:${f.height}px;min-width:100%;min-height:100%;`;
    const childHtml = (f.children ?? [])
      .filter((c) => c.type !== "TOPBAR")
      .map((c) => {
        // Children are already in frame-local coordinates; do not subtract frame position
        return nodeToHtml(c, (f.layoutMode ?? "NONE") !== "NONE" ? (f.layoutMode as "HORIZONTAL" | "VERTICAL") : "NONE", 3);
      })
      .filter(Boolean)
      .join("\n");
    return `    <div data-frame data-frame-id="${f.id}" style="${fStyle}"><div style="${wrapStyle}">\n${childHtml}\n    </div></div>`;
  }).join("\n");

  return buildHtml(appName, topBarHtml, framesHtml, apiBase);
}

function buildHtml(appName: string, topBarHtml: string, framesHtml: string, apiBase = ""): string {
  const apiBaseScript = apiBase ? `window.__CHAT_API_BASE__="${apiBase.replace(/"/g, '\\"')}";` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(appName)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app-layout">
${topBarHtml}
    <div class="app-root">
${framesHtml}
    </div>
  </div>
  <script src="window-controls.js"></script>
  <script>${apiBaseScript}</script>
  <style>
    /* ── Hover presets ── */
    [data-hover="lift"]{transition:transform 0.2s ease,box-shadow 0.2s ease;}
    [data-hover="lift"]:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,0.35);}
    [data-hover="glow"]{transition:box-shadow 0.2s ease;}
    [data-hover="glow"]:hover{box-shadow:0 0 0 3px rgba(94,92,230,0.5),0 0 16px rgba(94,92,230,0.3);}
    [data-hover="scale"]{transition:transform 0.15s ease;}
    [data-hover="scale"]:hover{transform:scale(1.04);}
    [data-hover="dim"]{transition:opacity 0.2s ease;}
    [data-hover="dim"]:hover{opacity:0.6;}
    [data-hover="brighten"]{transition:filter 0.2s ease;}
    [data-hover="brighten"]:hover{filter:brightness(1.25);}
    [data-hover="border-glow"]{transition:outline 0.15s ease,box-shadow 0.15s ease;}
    [data-hover="border-glow"]:hover{outline:2px solid rgba(94,92,230,0.8);box-shadow:0 0 10px rgba(94,92,230,0.3);}
    /* ── Keyframe animations ── */
    @keyframes rnd-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}
    @keyframes rnd-shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-6px);}40%{transform:translateX(6px);}60%{transform:translateX(-4px);}80%{transform:translateX(4px);}}
    @keyframes rnd-bounce{0%,100%{transform:translateY(0);}40%{transform:translateY(-12px);}70%{transform:translateY(-6px);}}
  </style>
  <script>
    // ── Frame navigation with transitions ──
    function _renderNavigate(targetId, transition) {
      var frames = document.querySelectorAll('[data-frame]');
      var target = document.querySelector('[data-frame-id="' + targetId + '"]');
      if (!target) return;
      var current = Array.from(frames).find(function(f){ return f.style.display !== 'none'; });
      if (current === target) return;
      if (!transition || transition === 'none') {
        frames.forEach(function(f){ f.style.display = 'none'; });
        target.style.display = 'block';
        return;
      }
      var dur = 280;
      var ease = 'cubic-bezier(0.4,0,0.2,1)';
      var outMap = { fade:'opacity:0', 'slide-left':'opacity:0;transform:translateX(-32px)', 'slide-right':'opacity:0;transform:translateX(32px)', 'slide-up':'opacity:0;transform:translateY(20px)', 'slide-down':'opacity:0;transform:translateY(-20px)', 'scale-up':'opacity:0;transform:scale(0.93)', 'scale-down':'opacity:0;transform:scale(1.07)' };
      var inMap  = { fade:'opacity:0', 'slide-left':'opacity:0;transform:translateX(32px)', 'slide-right':'opacity:0;transform:translateX(-32px)', 'slide-up':'opacity:0;transform:translateY(-20px)', 'slide-down':'opacity:0;transform:translateY(20px)', 'scale-up':'opacity:0;transform:scale(1.07)', 'scale-down':'opacity:0;transform:scale(0.93)' };
      function applyStyle(el, str) { str.split(';').forEach(function(s){ var p=s.split(':'); if(p[0])el.style[p[0].trim()]=p[1]?p[1].trim():''; }); }
      if (current) {
        current.style.transition = 'all ' + dur + 'ms ' + ease;
        applyStyle(current, outMap[transition] || 'opacity:0');
        setTimeout(function(){
          current.style.display = 'none';
          current.style.transition = '';
          current.style.opacity = '';
          current.style.transform = '';
          target.style.display = 'block';
          applyStyle(target, inMap[transition] || 'opacity:0');
          requestAnimationFrame(function(){ requestAnimationFrame(function(){
            target.style.transition = 'all ' + dur + 'ms ' + ease;
            target.style.opacity = '1';
            target.style.transform = 'none';
            setTimeout(function(){ target.style.transition=''; }, dur);
          }); });
        }, dur);
      } else {
        frames.forEach(function(f){ f.style.display = 'none'; });
        target.style.display = 'block';
      }
    }
    // ── Chat input + Send wire-up → /api/ai/chat-completions (OpenAI when server key is set) ──
    function _wireChat() {
      var inputWrap = document.querySelector('[data-chat-role="chat-input"]');
      var sendBtn = document.querySelector('[data-chat-role="chat-send"]');
      var messagesEl = document.querySelector('[data-chat-role="chat-messages"]');
      if (!inputWrap || !sendBtn || !messagesEl) return;
      var input = inputWrap.querySelector('input');
      if (!input) return;
      var base = (typeof window !== 'undefined' && window.__CHAT_API_BASE__) ? window.__CHAT_API_BASE__ : '';
      var apiUrl = base + '/api/ai/chat-completions';
      function send() {
        var text = (input.value || '').trim();
        if (!text) return;
        var userDiv = document.createElement('div');
        userDiv.style.cssText = 'position:relative;left:24px;top:12px;width:400px;font-size:14px;color:#e6edf3;margin-bottom:8px;';
        userDiv.textContent = text;
        var aiDiv = document.createElement('div');
        aiDiv.style.cssText = 'position:relative;left:24px;top:12px;width:700px;font-size:14px;color:#8b949e;line-height:1.5;margin-bottom:24px;';
        aiDiv.textContent = 'Thinking...';
        messagesEl.appendChild(userDiv);
        messagesEl.appendChild(aiDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        input.value = '';
        var hist = [];
        Array.prototype.forEach.call(messagesEl.children, function(el) {
          if (el.getAttribute('data-chat-msg-user')) hist.push({role:'user',content:el.textContent||''});
          if (el.getAttribute('data-chat-msg-ai')) hist.push({role:'assistant',content:el.textContent||''});
        });
        hist.push({role:'user',content:text});
        fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: hist, stream: true }) })
          .then(function(r){
            var ct = (r.headers && r.headers.get && r.headers.get('content-type')) || '';
            if (r.ok && ct.indexOf('text/event-stream') !== -1 && r.body && r.body.getReader) {
              var reader = r.body.getReader();
              var dec = new TextDecoder();
              var buf = '';
              var out = '';
              var think = '';
              function pump() {
                return reader.read().then(function(res){
                  if (res.done) {
                    aiDiv.innerHTML = '';
                    if (think) {
                      var det = document.createElement('details');
                      det.style.cssText = 'margin-bottom:8px;font-size:12px;color:#6e7681;';
                      var sum = document.createElement('summary');
                      sum.textContent = 'Reasoning';
                      det.appendChild(sum);
                      var pre = document.createElement('pre');
                      pre.style.cssText = 'white-space:pre-wrap;margin:6px 0 0;padding-left:8px;border-left:2px solid #30363d;font-size:12px;color:#8b949e;';
                      pre.textContent = think;
                      det.appendChild(pre);
                      aiDiv.appendChild(det);
                    }
                    var p = document.createElement('div');
                    p.style.cssText = 'line-height:1.5;color:#8b949e;';
                    p.textContent = out;
                    aiDiv.appendChild(p);
                    aiDiv.setAttribute('data-chat-msg-ai','');
                    userDiv.setAttribute('data-chat-msg-user','');
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                    return;
                  }
                  buf += dec.decode(res.value, { stream: true });
                  var lines = buf.split(String.fromCharCode(10));
                  buf = lines.pop() || '';
                  for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line.indexOf('data:') !== 0) continue;
                    var data = line.slice(5).trim();
                    var j;
                    try { j = JSON.parse(data); } catch (e) { continue; }
                    if (j.error) { throw new Error(j.error); }
                    if (j.done) continue;
                    if (j.content) out += j.content;
                    if (j.reasoning) think += j.reasoning;
                  }
                  aiDiv.textContent = (think ? '[Reasoning…] ' : '') + out;
                  messagesEl.scrollTop = messagesEl.scrollHeight;
                  return pump();
                });
              }
              return pump();
            }
            return r.json().then(function(d){ return { ok: r.ok, data: d }; });
          })
          .then(function(res){
            if (!res) return;
            if (res.ok !== undefined && res.data) {
              aiDiv.textContent = res.ok && res.data.content ? res.data.content : (res.data.error || 'Error: ' + (res.ok ? 'No response' : 'Request failed'));
              aiDiv.setAttribute('data-chat-msg-ai','');
              userDiv.setAttribute('data-chat-msg-user','');
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
          })
          .catch(function(e){ aiDiv.textContent = 'Error: ' + (e && e.message ? e.message : 'Network error'); aiDiv.setAttribute('data-chat-msg-ai',''); userDiv.setAttribute('data-chat-msg-user',''); });
      }
      sendBtn.addEventListener('click', send);
      input.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    }
    // ── ON_LOAD interactions ──
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('[data-onload]').forEach(function(el) {
        var js = el.getAttribute('data-onload');
        if (js) { try { (new Function(js)).call(el); } catch(e) { console.warn('ON_LOAD error', e); } }
      });
      _wireChat();
    });
  </script>
</body>
</html>
`;
}

/**
 * Get frame dimensions from scene nodes (for window sizing).
 * Includes top bar height in total window height.
 */
export function getFrameDimensions(nodes: SceneNode[]): { width: number; height: number } {
  const frame = nodes.find((n) => n.type === "FRAME") ?? nodes[0];
  const topBarNode = nodes.find((n) => n.type === "TOPBAR")
    ?? (frame?.children ?? []).find((n) => n.type === "TOPBAR");
  if (!frame) return { width: 800, height: 600 };
  const tbH = topBarNode?.height ?? 0;
  return { width: frame.width, height: frame.height + tbH };
}

/**
 * Generate minimal CSS for exported app - no centering, fills viewport.
 */
export function sceneExportCss(canvasBg = "#0d0f12"): string {
  return `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: ${canvasBg};
  color: #e6edf3;
}

.app-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-root {
  flex: 1;
  overflow: hidden;
  position: relative;
}
`;
}
