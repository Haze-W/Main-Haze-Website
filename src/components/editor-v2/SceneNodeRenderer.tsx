"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { SceneNode } from "@/lib/editor/types";
import { getValidIconName } from "@/lib/icon-valid";
import { useEditorStore } from "@/lib/editor/store";
import { loadGoogleFont } from "@/lib/editor/fonts";
import { FrameNode } from "./FrameNode";
import { FigmaNodeRenderer } from "./FigmaNodeRenderer";
import { TopBarNode } from "./TopBarNode";
import { ResizeHandles } from "./ResizeHandles";
import styles from "./SceneNodeRenderer.module.css";

const DynamicIcon = dynamic(
  () => import("lucide-react/dynamic").then((m) => m.DynamicIcon),
  { ssr: false }
);

interface SceneNodeRendererProps {
  node: SceneNode;
  isSelected: boolean;
  zoom: number;
}

export function SceneNodeRenderer({ node, isSelected, zoom }: SceneNodeRendererProps) {
  if (node.visible === false) return null;
  if (node.props?._figma) {
    return <FigmaNodeRenderer node={node} isSelected={isSelected} zoom={zoom} />;
  }
  if (node.type === "TOPBAR") {
    return <TopBarNode node={node} isSelected={isSelected} zoom={zoom} />;
  }
  if (node.type === "FRAME") {
    return <FrameNode node={node} isSelected={isSelected} zoom={zoom} />;
  }
  return <GenericNode node={node} isSelected={isSelected} zoom={zoom} />;
}

function GenericNode({ node, isSelected, zoom }: SceneNodeRendererProps) {
  const { setSelectedIds, toggleSelection, moveNodes, resizeNode, pushHistory, updateNode, selectedIds } = useEditorStore();
  const [isHovered, setIsHovered] = useState(false);

  const handleResizeStart = useCallback(
    (handle: string) => (e: React.PointerEvent) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      const last = { clientX: e.clientX, clientY: e.clientY };
      const onMove = (move: PointerEvent) => {
        const currentZoom = useEditorStore.getState().viewport.zoom;
        const dx = (move.clientX - last.clientX) / currentZoom;
        const dy = (move.clientY - last.clientY) / currentZoom;
        resizeNode(node.id, handle, dx, dy);
        last.clientX = move.clientX;
        last.clientY = move.clientY;
      };
      const onUp = () => {
        target.releasePointerCapture(e.pointerId);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        pushHistory();
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [node.id, resizeNode, pushHistory]
  );

  const props = node.props ?? {};
  const variant = (props.variant as string) ?? "";
  const hoverPreset = (props._hoverPreset as string) ?? "none";

  const isLocked = !!node.locked;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    if (e.shiftKey) toggleSelection(node.id);
    else setSelectedIds([node.id]);
  };

  // Base style — applies to every node
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    boxSizing: "border-box",
    cursor: "pointer",
    outline: isSelected ? "2px solid var(--accent)" : "none",
    outlineOffset: -1,
    overflow: "hidden",
    opacity: node.opacity != null && node.opacity < 1 ? node.opacity : undefined,
    ...((() => {
      const parts: string[] = [];
      if (node.rotation) parts.push(`rotate(${node.rotation}deg)`);
      if (props.scaleX !== undefined) parts.push(`scaleX(${props.scaleX})`);
      if (props.scaleY !== undefined) parts.push(`scaleY(${props.scaleY})`);
      return parts.length ? { transform: parts.join(" ") } : {};
    })()),
    ...(hoverPreset !== "none" ? {
      transition:
        hoverPreset === "lift"   ? "transform 0.2s ease, box-shadow 0.2s ease" :
        hoverPreset === "scale"  ? "transform 0.15s ease" :
        hoverPreset === "dim" || hoverPreset === "brighten" ? "opacity 0.2s ease, filter 0.2s ease" :
        "box-shadow 0.2s ease",
    } : {}),
  };

  // Hover effect
  const hoverStyle: React.CSSProperties = isHovered && hoverPreset !== "none" ? (
    hoverPreset === "lift"        ? { transform: (baseStyle.transform ?? "") + " translateY(-4px)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" } :
    hoverPreset === "scale"       ? { transform: (baseStyle.transform ?? "") + " scale(1.04)" } :
    hoverPreset === "dim"         ? { opacity: 0.6 } :
    hoverPreset === "brighten"    ? { filter: "brightness(1.25)" } :
    hoverPreset === "glow"        ? { boxShadow: "0 0 0 3px rgba(94,92,230,0.5), 0 0 16px rgba(94,92,230,0.3)" } :
    hoverPreset === "border-glow" ? { outline: "2px solid rgba(94,92,230,0.8)", boxShadow: "0 0 10px rgba(94,92,230,0.3)" } :
    {}
  ) : {};

  const hoverHandlers = hoverPreset !== "none" ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  const drag = createDragHandler(node.id, zoom, moveNodes, pushHistory, isLocked);
  const merged = { ...baseStyle, ...hoverStyle, ...(isLocked ? { cursor: "not-allowed", opacity: (Number(baseStyle.opacity) || 1) * 0.7 } : {}) };

  // ── ICON ──────────────────────────────────────────────────────────────────
  if (node.type === "ICON") {
    const iconName = getValidIconName(props.iconName as string | undefined);
    const size = Math.min((props.size as number) ?? 24, node.width, node.height) - 4;
    const color = (props.color as string) || "currentColor";
    return (
      <div
        className={styles.iconNode}
        style={{ ...merged, display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={handleClick}
        onPointerDown={drag}
        {...hoverHandlers}
      >
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        <DynamicIcon
          name={iconName as never}
          size={size}
          strokeWidth={1.5}
          style={{ color }}
          fallback={() => <span style={{ fontSize: size, color }}>◆</span>}
        />
      </div>
    );
  }

  // ── BUTTON ────────────────────────────────────────────────────────────────
  if (node.type === "BUTTON") {
    const label = (props.label as string) ?? (variant === "icon" ? "" : "Button");
    const btnColor = (props.color as string) || undefined;
    const btnBg = (props.backgroundColor as string) || undefined;
    const btnClass = [
      styles.button,
      variant === "primary"   && styles.btnPrimary,
      variant === "secondary" && styles.btnSecondary,
      variant === "outline"   && styles.btnOutline,
      variant === "ghost"     && styles.btnGhost,
      variant === "danger"    && styles.btnDanger,
      variant === "icon"      && styles.btnIcon,
    ].filter(Boolean).join(" ");
    return (
      <div
        className={btnClass}
        style={{ ...merged, ...(btnColor && { color: btnColor }), ...(btnBg && { backgroundColor: btnBg }) }}
        onClick={handleClick}
        onPointerDown={drag}
        {...hoverHandlers}
      >
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        {variant === "icon" && (props.iconName as string) ? (
          <DynamicIcon
            name={getValidIconName(props.iconName as string) as never}
            size={20}
            strokeWidth={2}
            fallback={() => <span style={{ fontSize: 20 }}>◆</span>}
          />
        ) : label}
      </div>
    );
  }

  // ── TEXT / HEADING / PARAGRAPH / LABEL ───────────────────────────────────
  if (node.type === "TEXT") {
    const content  = (props.content as string) ?? "Text";
    const fontSize = (props.fontSize as number) ?? 14;
    const fontWeight = (props.fontWeight as string) ?? "normal";
    const textAlign = (props.textAlign as string) ?? "left";
    const color = (props.color as string) || undefined;
    const fontFamily = (props.fontFamily as string) || undefined;
    if (fontFamily) loadGoogleFont(fontFamily);
    return (
      <div
        className={styles.textNode}
        style={{
          ...merged,
          overflow: "visible",
          fontSize,
          fontWeight,
          textAlign: textAlign as React.CSSProperties["textAlign"],
          ...(color && { color }),
          ...(fontFamily && { fontFamily: `"${fontFamily}", sans-serif` }),
        }}
        onClick={handleClick}
        onPointerDown={drag}
        {...hoverHandlers}
      >
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        {content}
      </div>
    );
  }

  // ── RECTANGLE ─────────────────────────────────────────────────────────────
  if (node.type === "RECTANGLE") {
    const bg = (props.backgroundColor as string) || undefined;
    const borderColor = (props.borderColor as string) || undefined;
    return (
      <div
        className={styles.rectNode}
        style={{ ...merged, ...(bg && { background: bg }), ...(borderColor && { borderColor, borderStyle: "solid" }) }}
        onClick={handleClick}
        onPointerDown={drag}
        {...hoverHandlers}
      >
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

  // ── INPUT / TEXTAREA ──────────────────────────────────────────────────────
  if (node.type === "INPUT") {
    const multiline = (props.multiline as boolean) ?? false;
    const ph = (props.placeholder as string) ?? "Input";
    const isSearch = (props.search as boolean) ?? false;
    return (
      <div
        className={styles.inputNode}
        style={{ ...merged }}
        onClick={handleClick}
        onPointerDown={drag}
        {...hoverHandlers}
      >
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        {isSearch && <span style={{ padding: "0 8px", color: "var(--fg-muted)", fontSize: 14 }}>🔍</span>}
        {multiline
          ? <div className={styles.textareaPlaceholder}>{ph}</div>
          : <div className={styles.inputPlaceholder}>{ph}</div>}
      </div>
    );
  }

  // ── CHECKBOX ──────────────────────────────────────────────────────────────
  if (node.type === "CHECKBOX") {
    const isSwitch = (props.switch as boolean) ?? false;
    const checked = (props.checked as boolean) ?? false;
    const label = (props.label as string) ?? "";
    const toggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedIds([node.id]);
      updateNode(node.id, { props: { ...props, checked: !checked } });
    };
    if (isSwitch) {
      return (
        <div className={styles.switchNode} style={merged} onClick={toggle} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={`${styles.switchTrack} ${checked ? styles.switchOn : ""}`}>
            <div className={styles.switchThumb} />
          </div>
        </div>
      );
    }
    return (
      <div className={styles.checkboxNode} style={merged} onClick={toggle} onPointerDown={drag} {...hoverHandlers}>
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        <div className={`${styles.checkboxBox} ${checked ? styles.checked : ""}`}>{checked && "✓"}</div>
        {label && <span style={{ fontSize: 14, color: "var(--fg-primary)" }}>{label}</span>}
      </div>
    );
  }

  // ── SELECT ────────────────────────────────────────────────────────────────
  if (node.type === "SELECT") {
    const ph = (props.placeholder as string) ?? "Select...";
    return (
      <div className={styles.selectNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        <span>{ph}</span>
        <span className={styles.selectArrow}>▼</span>
      </div>
    );
  }

  // ── IMAGE ─────────────────────────────────────────────────────────────────
  if (node.type === "IMAGE") {
    const src = (props.src as string) ?? "";
    const rounded = (props.rounded as boolean) ?? false;
    return (
      <div
        className={`${styles.imageNode} ${rounded ? styles.rounded : ""}`}
        style={merged}
        onClick={handleClick}
        onPointerDown={drag}
        {...hoverHandlers}
      >
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        {src
          ? <img src={src} alt={(props.alt as string) ?? ""} />
          : <div className={styles.imagePlaceholder}>{rounded ? "👤" : "🖼"}</div>}
      </div>
    );
  }

  // ── DIVIDER ───────────────────────────────────────────────────────────────
  if (node.type === "DIVIDER") {
    return (
      <div className={styles.dividerNode} style={merged} onClick={handleClick} onPointerDown={drag}>
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

  // ── SPACER ────────────────────────────────────────────────────────────────
  if (node.type === "SPACER") {
    return (
      <div className={styles.spacerNode} style={merged} onClick={handleClick} onPointerDown={drag}>
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

  // ── PANEL ─────────────────────────────────────────────────────────────────
  if (node.type === "PANEL") {
    const title = (props.title as string) ?? "Panel";
    return (
      <div className={styles.panelNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        <div className={styles.panelHeader}>{title}</div>
        <div className={styles.panelBody} />
      </div>
    );
  }

  // ── LIST ──────────────────────────────────────────────────────────────────
  if (node.type === "LIST") {
    return (
      <div className={styles.listNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        {["Item one", "Item two", "Item three"].map((item, i) => (
          <div key={i} className={styles.listItem}>{item}</div>
        ))}
      </div>
    );
  }

  // ── CONTAINER with named variants ────────────────────────────────────────
  if (node.type === "CONTAINER") {

    // CONTAINER with children — render them so design matches preview (sidebar, navbar, card, content)
    if (node.children && node.children.length > 0) {
      const bg = (props.backgroundColor as string) || undefined;
      const radius = (props.borderRadius as number) ?? 6;
      const shadow = (props.boxShadow as string) || undefined;
      const containerStyle: React.CSSProperties = {
        ...merged,
        ...(bg && { backgroundColor: bg }),
        borderRadius: radius,
        ...(shadow && { boxShadow: shadow }),
      };
      return (
        <div className={styles.genericNode} style={containerStyle} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 1 }}>
            {node.children.map((child) => (
              <SceneNodeRenderer
                key={child.id}
                node={child}
                isSelected={selectedIds.has(child.id)}
                zoom={zoom}
              />
            ))}
          </div>
        </div>
      );
    }

    // PROGRESS BAR
    if (variant === "progress" || node.name === "Progress Bar") {
      const value = (props.value as number) ?? 60;
      return (
        <div className={styles.progressNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${value}%` }} />
          </div>
        </div>
      );
    }

    // SLIDER
    if (node.name === "Slider") {
      const sliderValue = (props.sliderValue as number) ?? 40;
      const trackRef = { current: null as HTMLDivElement | null };
      const handleSliderPointer = (e: React.PointerEvent) => {
        e.stopPropagation();
        const track = (e.currentTarget as HTMLElement).closest(`.${styles.sliderTrack}`) as HTMLElement;
        if (!track) return;
        track.setPointerCapture(e.pointerId);
        const update = (ev: PointerEvent) => {
          const rect = track.getBoundingClientRect();
          const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
          updateNode(node.id, { props: { ...props, sliderValue: Math.round(pct) } });
        };
        const up = () => {
          track.removeEventListener("pointermove", update);
          track.removeEventListener("pointerup", up);
        };
        track.addEventListener("pointermove", update);
        track.addEventListener("pointerup", up);
        update(e.nativeEvent);
      };
      return (
        <div className={styles.sliderNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div
            className={styles.sliderTrack}
            onPointerDown={handleSliderPointer}
            style={{ cursor: "ew-resize" }}
          >
            <div className={styles.sliderFill} style={{ width: `${sliderValue}%` }} />
            <div
              className={styles.sliderThumb}
              style={{ left: `${sliderValue}%` }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      );
    }

    // SPINNER
    if (node.name === "Spinner") {
      return (
        <div className={styles.spinnerNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.spinner} />
        </div>
      );
    }

    // SKELETON
    if (node.name === "Skeleton") {
      return (
        <div className={styles.skeletonNode} style={merged} onClick={handleClick} onPointerDown={drag}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
        </div>
      );
    }

    // BADGE / TAG
    if (node.name === "Badge" || node.name === "Tag") {
      const content = (props.content as string) ?? node.name;
      const bg = (props.backgroundColor as string) || undefined;
      const fg = (props.color as string) || undefined;
      return (
        <div
          className={styles.badgeNode}
          style={{ ...merged, ...(bg && { backgroundColor: bg }), ...(fg && { color: fg }) }}
          onClick={handleClick} onPointerDown={drag} {...hoverHandlers}
        >
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          {content}
        </div>
      );
    }

    // ALERT
    if (node.name === "Alert") {
      const content = (props.content as string) ?? "Alert message";
      const v = (props.variant as string) ?? "info";
      const variantClass = v === "success" ? styles.alertSuccess : v === "warning" ? styles.alertWarning : v === "error" ? styles.alertError : styles.alertInfo;
      return (
        <div className={`${styles.alertNode} ${variantClass}`} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          {content}
        </div>
      );
    }

    // TOOLTIP
    if (node.name === "Tooltip") {
      const content = (props.content as string) ?? "Tooltip text";
      return (
        <div className={styles.tooltipNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          {content}
        </div>
      );
    }

    // TABS
    if (node.name === "Tabs") {
      const tabs = (props.tabs as string[]) ?? ["Tab 1", "Tab 2"];
      const activeTab = (props.activeTab as number) ?? 0;
      return (
        <div className={styles.tabsNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.tabsHeader}>
            {tabs.map((t, i) => (
              <div
                key={i}
                className={`${styles.tabItem} ${i === activeTab ? styles.tabActive : ""}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  updateNode(node.id, { props: { ...props, activeTab: i } });
                  setSelectedIds([node.id]);
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div className={styles.tabsBody}>
            <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{tabs[activeTab]}</span>
          </div>
        </div>
      );
    }

    // NAVBAR
    if (variant === "navbar" || node.name === "Navbar") {
      return (
        <div className={styles.navbarNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.navbarLogo}>Logo</div>
          <div className={styles.navbarLinks}>
            <span>Home</span><span>About</span><span>Docs</span>
          </div>
        </div>
      );
    }

    // SIDEBAR
    if (variant === "sidebar" || node.name === "Sidebar") {
      return (
        <div className={styles.sidebarNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          {["Dashboard", "Projects", "Settings", "Account"].map((item, i) => (
            <div key={i} className={`${styles.sidebarItem} ${i === 0 ? styles.sidebarActive : ""}`}>{item}</div>
          ))}
        </div>
      );
    }

    // CARD
    if (variant === "card" || node.name === "Card") {
      return (
        <div className={styles.cardNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.cardHeader}>Card Title</div>
          <div className={styles.cardBody}>Card content goes here</div>
        </div>
      );
    }

    // MODAL
    if (variant === "modal" || node.name === "Modal") {
      return (
        <div className={styles.modalNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.modalHeader}><span>Modal Title</span><span className={styles.modalClose}>✕</span></div>
          <div className={styles.modalBody}>Modal content</div>
          <div className={styles.modalFooter}><div className={styles.modalBtn}>Cancel</div><div className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}>Confirm</div></div>
        </div>
      );
    }

    // DRAWER
    if (variant === "drawer" || node.name === "Drawer") {
      return (
        <div className={styles.drawerNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.drawerHeader}><span>Drawer</span><span className={styles.modalClose}>✕</span></div>
          <div className={styles.drawerBody}>Drawer content</div>
        </div>
      );
    }

    // TOAST
    if (variant === "toast" || node.name === "Toast") {
      return (
        <div className={styles.toastNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <span className={styles.toastIcon}>✓</span>
          <span className={styles.toastText}>Action completed successfully</span>
          <span className={styles.toastClose}>✕</span>
        </div>
      );
    }

    // TABLE
    if (node.name === "Table") {
      const cols = ["Name", "Status", "Value"];
      const rows = [["Item A", "Active", "$120"], ["Item B", "Pending", "$80"]];
      return (
        <div className={styles.tableNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.tableHeader}>
            {cols.map((c) => <div key={c} className={styles.tableCell}>{c}</div>)}
          </div>
          {rows.map((row, i) => (
            <div key={i} className={styles.tableRow}>
              {row.map((cell, j) => <div key={j} className={styles.tableCell}>{cell}</div>)}
            </div>
          ))}
        </div>
      );
    }

    // PAGINATION
    if (node.name === "Pagination") {
      return (
        <div className={styles.paginationNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          {["‹", "1", "2", "3", "›"].map((p, i) => (
            <div key={i} className={`${styles.pageBtn} ${p === "1" ? styles.pageActive : ""}`}>{p}</div>
          ))}
        </div>
      );
    }

    // BREADCRUMBS
    if (node.name === "Breadcrumbs") {
      return (
        <div className={styles.breadcrumbsNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          {["Home", "Projects", "Current"].map((b, i, arr) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className={i === arr.length - 1 ? styles.breadcrumbActive : styles.breadcrumbLink}>{b}</span>
              {i < arr.length - 1 && <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>/</span>}
            </span>
          ))}
        </div>
      );
    }

    // ACCORDION
    if (node.name === "Accordion") {
      const sections = (props.sections as string[]) ?? ["Section 1", "Section 2", "Section 3"];
      const openIndex = (props.openIndex as number) ?? 0;
      return (
        <div className={styles.accordionNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          {sections.map((s, i) => {
            const isOpen = i === openIndex;
            return (
              <div key={i} className={styles.accordionItem}>
                <div
                  className={styles.accordionHeader}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    updateNode(node.id, { props: { ...props, openIndex: isOpen ? -1 : i } });
                    setSelectedIds([node.id]);
                  }}
                >
                  <span>{s}</span>
                  <span style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}>▼</span>
                </div>
                {isOpen && (
                  <div className={styles.accordionBody}>
                    Content for {s}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // STATS WIDGET
    if (node.name === "Stats") {
      return (
        <div className={styles.statsNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.statsValue}>2,847</div>
          <div className={styles.statsLabel}>Total Users</div>
          <div className={styles.statsChange}>↑ 12% this week</div>
        </div>
      );
    }

    // CHARTS
    if (node.name === "Bar Chart") {
      const rawData = (props.data as string) ?? "60,85,45,90,70,55,80";
      const bars = rawData.split(",").map((v) => Math.max(2, Math.min(100, Number(v.trim()) || 50)));
      return (
        <div className={styles.chartNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.chartBars}>
            {bars.map((h, i) => (
              <div key={i} className={styles.chartBar} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      );
    }

    if (node.name === "Line Chart") {
      const rawData = (props.data as string) ?? "50,35,45,20,30,15,25";
      const values = rawData.split(",").map((v) => Math.max(0, Math.min(100, Number(v.trim()) || 50)));
      const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${v}`).join(" ");
      const area = pts + ` 100,100 0,100`;
      return (
        <div className={styles.chartNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <svg width="100%" height="80%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" />
            <polygon points={area} fill="rgba(94,92,230,0.15)" />
          </svg>
        </div>
      );
    }

    if (node.name === "Pie Chart") {
      const rawData = (props.data as string) ?? "50,30,20";
      const values = rawData.split(",").map((v) => Math.max(1, Number(v.trim()) || 10));
      const total = values.reduce((a, b) => a + b, 0);
      const colors = ["var(--accent)", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];
      let cumulative = 0;
      const slices = values.map((v, i) => {
        const pct = v / total;
        const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
        cumulative += pct;
        const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
        const x1 = 16 + 16 * Math.cos(startAngle);
        const y1 = 16 + 16 * Math.sin(startAngle);
        const x2 = 16 + 16 * Math.cos(endAngle);
        const y2 = 16 + 16 * Math.sin(endAngle);
        const large = pct > 0.5 ? 1 : 0;
        return <path key={i} d={`M16,16 L${x1},${y1} A16,16 0 ${large},1 ${x2},${y2} Z`} fill={colors[i % colors.length]} />;
      });
      return (
        <div className={styles.chartNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <svg viewBox="0 0 32 32" style={{ width: "70%", height: "70%" }}>{slices}</svg>
        </div>
      );
    }

    // FORM / LOGIN_FORM
    if (node.name === "Form" || node.name === "Login Form") {
      return (
        <div className={styles.formNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          {node.name === "Login Form" && <div className={styles.formTitle}>Sign In</div>}
          <div className={styles.formField}><div className={styles.formLabel}>Email</div><div className={styles.formInput}>email@example.com</div></div>
          <div className={styles.formField}><div className={styles.formLabel}>Password</div><div className={styles.formInput}>••••••••</div></div>
          <div className={styles.formSubmit}>{node.name === "Login Form" ? "Sign In" : "Submit"}</div>
        </div>
      );
    }

    // PRICING CARD
    if (node.name === "Pricing Card") {
      return (
        <div className={styles.pricingNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.pricingTier}>Pro</div>
          <div className={styles.pricingPrice}>$49<span>/mo</span></div>
          {["Unlimited projects", "Priority support", "Analytics"].map((f, i) => (
            <div key={i} className={styles.pricingFeature}><span>✓</span>{f}</div>
          ))}
          <div className={styles.pricingCta}>Get Started</div>
        </div>
      );
    }

    // HERO SECTION
    if (node.name === "Hero") {
      return (
        <div className={styles.heroNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.heroHeading}>Build something great</div>
          <div className={styles.heroSub}>The fastest way to ship real desktop apps.</div>
          <div className={styles.heroCta}>Get Started</div>
        </div>
      );
    }

    // CTA
    if (node.name === "CTA") {
      return (
        <div className={styles.ctaNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.ctaText}>Ready to get started?</div>
          <div className={styles.ctaBtn}>Try for free</div>
        </div>
      );
    }

    // VIDEO
    if (node.name === "Video") {
      return (
        <div className={styles.videoNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.videoPlay}>▶</div>
          <div className={styles.videoBar} />
        </div>
      );
    }

    // AUDIO
    if (node.name === "Audio") {
      return (
        <div className={styles.audioNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <span style={{ fontSize: 18 }}>▶</span>
          <div className={styles.audioTrack}><div className={styles.audioFill} /></div>
          <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>0:00</span>
        </div>
      );
    }

    // FILE UPLOAD
    if (node.name === "File Upload") {
      return (
        <div className={styles.uploadNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div style={{ fontSize: 24 }}>📁</div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>Drop files here or click to upload</div>
        </div>
      );
    }

    // COLOR PICKER
    if (node.name === "Color Picker") {
      return (
        <div className={styles.colorPickerNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.colorSwatches}>
            {["#5e5ce6","#22c55e","#f59e0b","#ef4444","#3b82f6","#ec4899"].map((c) => (
              <div key={c} className={styles.colorSwatch} style={{ background: c }} />
            ))}
          </div>
          <div className={styles.colorHexRow}><div className={styles.colorHexInput}>#5e5ce6</div></div>
        </div>
      );
    }

    // KANBAN
    if (node.name === "Kanban") {
      return (
        <div className={styles.kanbanNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.kanbanHeader}>To Do <span className={styles.kanbanCount}>3</span></div>
          {["Task one", "Task two", "Task three"].map((t, i) => (
            <div key={i} className={styles.kanbanCard}>{t}</div>
          ))}
        </div>
      );
    }

    // CHAT BUBBLE
    if (node.name === "Chat Bubble") {
      return (
        <div className={styles.chatBubbleNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.chatAvatar}>U</div>
          <div className={styles.chatText}>Hey, how's it going?</div>
        </div>
      );
    }

    // TIMELINE
    if (node.name === "Timeline") {
      return (
        <div className={styles.timelineNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          {["Project started", "First release", "Version 2.0"].map((e, i) => (
            <div key={i} className={styles.timelineItem}>
              <div className={styles.timelineDot} />
              <div className={styles.timelineContent}>{e}</div>
            </div>
          ))}
        </div>
      );
    }

    // USER PROFILE
    if (node.name === "User Profile") {
      return (
        <div className={styles.userProfileNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.userAvatar}>U</div>
          <div className={styles.userInfo}><div className={styles.userName}>John Doe</div><div className={styles.userEmail}>john@example.com</div></div>
        </div>
      );
    }

    // EMPTY / ERROR / SUCCESS STATES
    if (node.name === "Empty State") {
      return (
        <div className={styles.stateNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div style={{ fontSize: 32 }}>📭</div>
          <div className={styles.stateTitle}>Nothing here yet</div>
          <div className={styles.stateSub}>Add some content to get started</div>
        </div>
      );
    }
    if (node.name === "Error State") {
      return (
        <div className={styles.stateNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div style={{ fontSize: 32 }}>❌</div>
          <div className={styles.stateTitle}>Something went wrong</div>
          <div className={styles.stateSub}>Please try again</div>
        </div>
      );
    }
    if (node.name === "Success State") {
      return (
        <div className={styles.stateNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div style={{ fontSize: 32 }}>✅</div>
          <div className={styles.stateTitle}>All done!</div>
          <div className={styles.stateSub}>Action completed successfully</div>
        </div>
      );
    }

    // MAP PLACEHOLDER
    if (node.name === "Map") {
      return (
        <div className={styles.mapNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div style={{ fontSize: 32 }}>🗺</div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>Map placeholder</div>
        </div>
      );
    }

    // GAUGE
    if (node.name === "Gauge") {
      return (
        <div className={styles.gaugeNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <svg viewBox="0 0 100 60" style={{ width: "80%" }}>
            <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="var(--bg-muted)" strokeWidth="8" strokeLinecap="round" />
            <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round" strokeDasharray="75 126" />
          </svg>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-primary)", marginTop: -8 }}>75%</div>
        </div>
      );
    }

    // NOTIFICATION
    if (node.name === "Notification") {
      return (
        <div className={styles.notificationNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.notifIcon}>🔔</div>
          <div className={styles.notifContent}><div className={styles.notifTitle}>New message</div><div className={styles.notifSub}>2 minutes ago</div></div>
          <div className={styles.notifDot} />
        </div>
      );
    }

    // COMMENT - Add comment style (icon + pill input)
    if (node.name === "Comment") {
      return (
        <div className={styles.commentNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.commentIconBtn}>+</div>
          <div className={styles.commentInputWrap}>
            <span className={styles.commentPlaceholder}>Add comment...</span>
          </div>
        </div>
      );
    }

    // CAROUSEL
    if (node.name === "Carousel") {
      const slides = (props.slides as string[]) ?? ["Slide 1", "Slide 2", "Slide 3"];
      const activeSlide = (props.activeSlide as number) ?? 0;
      const prev = (e: React.PointerEvent) => {
        e.stopPropagation();
        const next = (activeSlide - 1 + slides.length) % slides.length;
        updateNode(node.id, { props: { ...props, activeSlide: next } });
        setSelectedIds([node.id]);
      };
      const next = (e: React.PointerEvent) => {
        e.stopPropagation();
        const n = (activeSlide + 1) % slides.length;
        updateNode(node.id, { props: { ...props, activeSlide: n } });
        setSelectedIds([node.id]);
      };
      return (
        <div className={styles.carouselNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.carouselSlide}>{slides[activeSlide]}</div>
          <div className={styles.carouselNav}>
            <span className={styles.carouselArrow} onPointerDown={prev}>‹</span>
            {slides.map((_, i) => (
              <span
                key={i}
                className={styles.carouselDot}
                style={{ opacity: i === activeSlide ? 1 : 0.35 }}
                onPointerDown={(e) => { e.stopPropagation(); updateNode(node.id, { props: { ...props, activeSlide: i } }); setSelectedIds([node.id]); }}
              />
            ))}
            <span className={styles.carouselArrow} onPointerDown={next}>›</span>
          </div>
        </div>
      );
    }

    // FOOTER
    if (node.name === "Footer") {
      return (
        <div className={styles.footerNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <span className={styles.footerBrand}>© 2026 App</span>
          <div className={styles.footerLinks}><span>Privacy</span><span>Terms</span><span>Contact</span></div>
        </div>
      );
    }

    // MARKDOWN / CODE BLOCK
    if (node.name === "Markdown" || node.name === "Code Block") {
      return (
        <div className={styles.codeNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.codeLine}><span style={{ color: "#f97316" }}>const</span> <span style={{ color: "#60a5fa" }}>app</span> = <span style={{ color: "#a3e635" }}>"Haze"</span></div>
          <div className={styles.codeLine}><span style={{ color: "#f97316" }}>export</span> <span style={{ color: "#f97316" }}>default</span> app</div>
        </div>
      );
    }

    // SETTINGS PANEL (as PANEL type)
    if (node.name === "Settings") {
      return (
        <div className={styles.panelNode} style={merged} onClick={handleClick} onPointerDown={drag} {...hoverHandlers}>
          {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
          <div className={styles.panelHeader}>Settings</div>
          <div className={styles.panelBody}>
            {["Theme", "Language", "Notifications"].map((s, i) => (
              <div key={i} style={{ padding: "6px 0", fontSize: 12, color: "var(--fg-secondary)", borderBottom: "1px solid var(--border-muted)" }}>{s}</div>
            ))}
          </div>
        </div>
      );
    }
  }

  // ── Generic fallback — shows the node name so it's never just a black box ──
  return (
    <div
      className={styles.genericNode}
      style={merged}
      onClick={handleClick}
      onPointerDown={drag}
      {...hoverHandlers}
    >
      {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      <span style={{ fontSize: 11, color: "var(--fg-muted)", opacity: 0.7 }}>{node.name}</span>
    </div>
  );
}

function createDragHandler(
  nodeId: string,
  zoom: number,
  moveNodes: (ids: string[], dx: number, dy: number) => void,
  pushHistory: () => void,
  locked = false
) {
  return (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (locked) return;
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const last = { clientX: e.clientX, clientY: e.clientY };
    let moved = false;
    const onMove = (move: PointerEvent) => {
      const currentZoom = useEditorStore.getState().viewport.zoom;
      const dx = (move.clientX - last.clientX) / currentZoom;
      const dy = (move.clientY - last.clientY) / currentZoom;
      if (dx !== 0 || dy !== 0) moved = true;
      moveNodes([nodeId], dx, dy);
      last.clientX = move.clientX;
      last.clientY = move.clientY;
    };
    const onUp = () => {
      target.releasePointerCapture(e.pointerId);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (moved) pushHistory();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };
}
