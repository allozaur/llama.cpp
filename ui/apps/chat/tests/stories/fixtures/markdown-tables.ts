// Tables as models write them: column alignment, inline code and links in
// cells, numbers to line up, and one table wider than the chat column.
const tick = '`';

export const MARKDOWN_TABLES_MD = `## Quantization types

| Type | Bits per weight | Size (7B) | Notes |
| :--- | ---: | ---: | :--- |
| ${tick}Q4_K_M${tick} | 4.85 | 4.07 GB | A good default for most models |
| ${tick}Q5_K_M${tick} | 5.69 | 4.78 GB | A bit more quality for a bit more memory |
| ${tick}Q8_0${tick} | 8.50 | 7.16 GB | Close to the original weights |
| ${tick}F16${tick} | 16.00 | 13.50 GB | Full half precision, see [the docs](https://github.com/ggml-org/llama.cpp) |

## Server flags

| Flag | Default | Description |
| --- | :---: | --- |
| ${tick}--ctx-size${tick} | 4096 | Context size in tokens |
| ${tick}--parallel${tick} | 1 | Number of slots that serve requests at once |
| ${tick}--jinja${tick} | on | Use the model's chat template |

## A wide table

| Model | Family | Parameters | Context | Quantization | Prompt t/s | Generation t/s | Memory | Backend | Notes |
| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | --- | --- |
| gpt-oss-20b | GPT-OSS | 20.9B | 131072 | MXFP4 | 1890.4 | 74.2 | 12.1 GB | Metal | Reasoning effort low, medium and high |
| Qwen3-8B | Qwen3 | 8.2B | 40960 | Q4_K_M | 1312.7 | 58.9 | 5.0 GB | Metal | Thinking can be turned off per request |
`;
