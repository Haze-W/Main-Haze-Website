import { useEditorStore } from "./store";

export type LayoutPresetId =
  | "container"
  | "panel"
  | "grid"
  | "flex-row"
  | "flex-col"
  | "divider"
  | "spacer"
  | "rectangle";

export function addLayoutPresetToCanvas(preset: LayoutPresetId, at?: { x: number; y: number }) {
  const get = useEditorStore.getState();
  const lastCanvasPoint = get.lastCanvasPoint;
  const offset = get.nodes.length * 24;
  const pos = at ?? lastCanvasPoint ?? { x: 120 + offset, y: 120 + offset };
  const addNode = get.addNode;

  switch (preset) {
    case "container":
      addNode(
        {
          type: "FRAME",
          name: "Container",
          ...pos,
          width: 300,
          height: 200,
          layoutMode: "HORIZONTAL",
          itemSpacing: 8,
          paddingTop: 8,
          paddingRight: 8,
          paddingBottom: 8,
          paddingLeft: 8,
          primaryAxisAlignItems: "MIN",
          counterAxisAlignItems: "MIN",
          props: { backgroundColor: "rgba(30,30,34,0.65)" },
        },
        undefined
      );
      break;
    case "panel":
      addNode(
        {
          type: "FRAME",
          name: "Panel",
          ...pos,
          width: 400,
          height: 300,
          props: { backgroundColor: "rgba(30,30,34,0.85)" },
        },
        undefined
      );
      break;
    case "grid":
      addNode(
        {
          type: "FRAME",
          name: "Grid",
          ...pos,
          width: 400,
          height: 300,
          layoutMode: "NONE",
          props: {
            backgroundColor: "rgba(30,30,34,0.5)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 8,
          },
        },
        undefined
      );
      break;
    case "flex-row":
      addNode(
        {
          type: "FRAME",
          name: "Flex Row",
          ...pos,
          width: 300,
          height: 60,
          layoutMode: "HORIZONTAL",
          itemSpacing: 8,
          primaryAxisAlignItems: "MIN",
          counterAxisAlignItems: "CENTER",
          props: { backgroundColor: "rgba(30,30,34,0.35)" },
        },
        undefined
      );
      break;
    case "flex-col":
      addNode(
        {
          type: "FRAME",
          name: "Flex Col",
          ...pos,
          width: 120,
          height: 300,
          layoutMode: "VERTICAL",
          itemSpacing: 8,
          primaryAxisAlignItems: "MIN",
          counterAxisAlignItems: "MIN",
          props: { backgroundColor: "rgba(30,30,34,0.35)" },
        },
        undefined
      );
      break;
    case "divider":
      addNode(
        {
          type: "DIVIDER",
          name: "Divider",
          ...pos,
          width: 200,
          height: 1,
          props: { backgroundColor: "#2e2e36" },
        },
        undefined
      );
      break;
    case "spacer":
      addNode(
        {
          type: "SPACER",
          name: "Spacer",
          ...pos,
          width: 16,
          height: 16,
        },
        undefined
      );
      break;
    case "rectangle":
      addNode(
        {
          type: "RECTANGLE",
          name: "Rectangle",
          ...pos,
          width: 100,
          height: 100,
          props: { backgroundColor: "#3f3f46", borderRadius: 4 },
        },
        undefined
      );
      break;
    default:
      break;
  }
}
