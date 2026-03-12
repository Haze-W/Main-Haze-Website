# AI Training Pipeline

## Dataset Flow

```
datasets/ui_designs/ (manual or external)
                          ↓
trainer.py (future) → Fine-tuned layout model
```

## Layout Extraction

To convert screenshots into UI JSON for training:

1. Use a layout detection model (LayoutLM, DocTR, or custom ViT)
2. Segment components (navbar, sidebar, cards, etc.)
3. Output bounding boxes + types
4. Convert to our UI schema format

## Fine-Tuning

For Llama/Mistral fine-tuning on layout generation:

- Input: prompt + optional image
- Output: JSON UI structure
- Use the JSON schema in `src/lib/ai/schema/ui-schema.ts`
