/** Normalized output from the style step (and validateUI input). */
export interface PipelineStyledData {
  style?: string;
  components: unknown[];
}

export function validateUI(data: unknown): asserts data is PipelineStyledData {
  if (!data || typeof data !== "object") throw new Error("No data");

  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.components)) {
    throw new Error("Invalid components");
  }
}
