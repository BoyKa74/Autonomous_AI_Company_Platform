export type FreeModel = {
  id: string;
  label: string;
  use: string;
};

/** Các model OpenCode Zen đang free ($0) và dùng endpoint chat/completions. */
export const OPENCODE_FREE_MODELS: FreeModel[] = [
  {
    id: "deepseek-v4.1-flash-free",
    label: "DeepSeek V4.1 Flash Free",
    use: "Viết, SEO, nội dung dài",
  },
  {
    id: "glm-5.3-flash-free",
    label: "GLM 5.3 Flash Free",
    use: "Phân tích, lập kế hoạch",
  },
  {
    id: "nemotron-3.5-lightning-free",
    label: "Nemotron 3.5 Lightning Free",
    use: "Tác vụ nhanh, phân loại",
  },
  {
    id: "nemotron-3.5-super-vl-free",
    label: "Nemotron 3.5 Super VL Free",
    use: "Ảnh/vision, mô tả nội dung",
  },
  {
    id: "mimo-v2.6-flash-free",
    label: "MiMo V2.6 Flash Free",
    use: "Dự phòng",
  },
  {
    id: "flint-40b-free",
    label: "Flint 40B Free",
    use: "Dự phòng",
  },
  {
    id: "beam-free",
    label: "Beam Free",
    use: "Dự phòng",
  },
  {
    id: "big-pickle",
    label: "Big Pickle (free)",
    use: "Dự phòng",
  },
];

export function isFreeOpencodeModel(model: string): boolean {
  return OPENCODE_FREE_MODELS.some((item) => item.id === model);
}

export function isFreeOpenrouterModel(model: string): boolean {
  return model.endsWith(":free") || model === "openrouter/free";
}
