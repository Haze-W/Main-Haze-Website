# Editor performance (canvas)

Large Figma pastes (hundreds of layers) stay interactive by:

1. **Transient drag** — Pointer-drag does **not** rewrite the scene tree every frame. `dragSession` stores cumulative `deltaX` / `deltaY`; nodes get `transform: translate(...)` + `will-change: transform`. On pointer up, **`moveNodes` runs once** and history is pushed.
2. **RAF batching** — `appendDragDelta` merges pointer deltas into one store update per animation frame.
3. **Narrow Zustand subscriptions** — Canvas uses `useShallow` so **`dragSession` updates don’t re-render the whole canvas**. Node renderers use `useShallow` for per-node drag offsets so only **dragged** nodes re-render during drag.
4. **`React.memo`** — `SceneNodeRenderer`, `FigmaNodeRenderer`, and `FrameNode` are memoized to avoid redundant subtree work when props are unchanged.

**Future ideas:** resize with transient session; `content-visibility` for off-screen subtrees; virtualize the layers panel.
