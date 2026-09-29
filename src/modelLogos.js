// Helper to map provider ID or model ID prefix to a logo path.
// Provider-level lookups (by providerId) take priority;
// model-level prefix lookups handle cases where NVIDIA hosts third-party models, etc.

/**
 * Returns a logo path for a PROVIDER ID (the card-level id, e.g. "groq", "zhipu", "ollamacloud").
 * Falls back to getModelLogo() for unknown providers.
 */
export function getProviderLogo(providerId = '') {
  const pid = providerId.toLowerCase();

  // Direct provider → logo mappings (all 87 configured providers)
  const PROVIDER_MAP = {
    // ── Core / well-known AI brands ──────────────────────────────
    'nvidia':          '/logos/nvidia.svg',
    'gemini':          '/logos/gemini.svg',
    'qwen-cloud':      '/logos/qwen-cloud.svg',
    'qwc':             '/logos/qwen-cloud.svg',   // alias
    'wandb':           '/logos/wandb.png',
    'cloudflare-ai':   '/logos/cloudflare-ai.svg',
    'cf':              '/logos/cloudflare-ai.svg',  // alias
    'openrouter':      '/logos/openrouter.svg',
    'anthropic':       '/logos/anthropic.svg',
    'openai':          '/logos/openai.svg',
    'groq':            '/logos/groq.svg',
    'deepseek':        '/logos/deepseek.svg',
    'mistral':         '/logos/mistral.svg',
    'cohere':          '/logos/cohere.svg',
    'xai':             '/logos/xai.svg',
    'ollama-cloud':    '/logos/ollama-cloud.svg',
    'ollamacloud':     '/logos/ollama-cloud.svg',  // alias
    'jina-ai':         '/logos/jina-ai.svg',
    'jina':            '/logos/jina-ai.svg',         // alias
    'alibaba':         '/logos/alibaba.svg',
    'ali':             '/logos/alibaba.svg',          // alias
    'searchapi':       '/logos/searchapi.svg',
    'searchapi-search':'/logos/searchapi.svg',       // alias
    'context7':        '/logos/context7.png',
    'elevenlabs':      '/logos/elevenlabs.svg',
    'gemma':           '/logos/gemma.svg',
    'google':          '/logos/google.svg',
    'poolside':        '/logos/poolside.svg',
    'zai':             '/logos/zai.svg',
    'zhipu':           '/logos/zhipu.svg',
    'writer':          '/logos/writer.svg',
    'bigcode':         '/logos/bigcode.svg',
    'aisingapore':     '/logos/aisingapore.png',
    'huggingface':     '/logos/huggingface.svg',
    'replicate':       '/logos/replicate.svg',
    'perplexity':      '/logos/perplexity.svg',
    'meta':            '/logos/meta.svg',
    'databricks':      '/logos/databricks.svg',
    'snowflake':       '/logos/snowflake.svg',
    'lmstudio':        '/logos/lmstudio.svg',
    'deepgram':        '/logos/deepgram.svg',
    'moonshot':        '/logos/moonshot.svg',
    'upstage':         '/logos/upstage.svg',
    'morph':           '/logos/morph.svg',
    'typhoon':         '/logos/typhoon.svg',
    'youcom-search':   '/logos/youcom-search.svg',
    'linkup':          '/logos/linkup.svg',
    'linkup-search':   '/logos/linkup-search.svg',  // alias
    'inception':       '/logos/inception.svg',
    'agy':             '/logos/agy.svg',

    // ── Router / aggregator / small providers ────────────────────
    'freee':           '/logos/freee.svg',
    'drd':             '/logos/drd.svg',
    'auto':            '/logos/auto.svg',
    'electronhub':     '/logos/electronhub.svg',
    'charm-hyper':     '/logos/charm-hyper.svg',
    'kenari':          '/logos/kenari.svg',
    'free-ai':         '/logos/free-ai.svg',
    'routeway':        '/logos/routeway.svg',
    'no-think':        '/logos/no-think.svg',
    'aion':            '/logos/aion.svg',
    'oad':             '/logos/oad.svg',
    'openadapter':     '/logos/openadapter.svg',
    'agnes':           '/logos/agnes.svg',
    'auriko':          '/logos/auriko.svg',
    'dahl':            '/logos/dahl.svg',
    'kg':              '/logos/kg.svg',
    'kilo-gateway':    '/logos/kilo-gateway.svg',
    'fastrouter':      '/logos/fastrouter.svg',
    'bazaarlink':      '/logos/bazaarlink.svg',
    'bzl':             '/logos/bzl.svg',
    'llm-kiwi':        '/logos/llm-kiwi.svg',
    'llmkiwi':         '/logos/llmkiwi.svg',
    'aifree':          '/logos/aifree.svg',
    'other':           '/logos/other.svg',
    'kilocode':        '/logos/kilocode.svg',
    'kc':              '/logos/kc.svg',
    'evolvex':         '/logos/evolvex.svg',
    'paxsenix':        '/logos/paxsenix.svg',
    'osaii':           '/logos/osaii.svg',
    'amanai':          '/logos/amanai.svg',
    'arcee':           '/logos/arcee.svg',
    'bai':             '/logos/bai.svg',
    'bynara':          '/logos/bynara.svg',
    'faucet':          '/logos/faucet.svg',
    'freetheai':       '/logos/freetheai.svg',
    'gonka':           '/logos/gonka.svg',
    'hallo':           '/logos/hallo.svg',
    'hcn':             '/logos/hcn.svg',
    'llm7':            '/logos/llm7.svg',
    'openagentic':     '/logos/openagentic.svg',
    'openai-codex':    '/logos/openai-codex.svg',
    'opencode-zen':    '/logos/opencode-zen.svg',
    'rsiai':           '/logos/rsiai.svg',
    'token-router':    '/logos/token-router.svg',
    'tokenharbor':     '/logos/tokenharbor.svg',
    'tokenreply':      '/logos/tokenreply.svg',
    'unikey':          '/logos/unikey.svg',
    'codecraft':       '/logos/codecraft.svg',
    'apmix':           '/logos/apmix.svg',
    'logfare':         '/logos/logfare.svg',
    'blazeapi':        '/logos/blazeapi.svg',
    'crax':            '/logos/crax.svg',
    'crax_backup':     '/logos/crax_backup.svg',
    'routmy':          '/logos/routmy.svg',
    'literouter':      '/logos/literouter.svg',
    'aquadevs':        '/logos/aquadevs.svg',
    'aichixia':        '/logos/aichixia.svg',
  };

  if (PROVIDER_MAP[pid]) return PROVIDER_MAP[pid];

  // Prefix-based fallback (e.g. "groq/llama3" -> groq logo)
  const providerPrefix = pid.split('/')[0];
  if (PROVIDER_MAP[providerPrefix]) return PROVIDER_MAP[providerPrefix];

  // Fall back to model-origin heuristics
  return getModelLogo(providerId);
}

/**
 * Returns a logo path for a MODEL ID (the underlying model creator/family).
 * Used when we want to show the model's brand rather than the provider routing it.
 */
export function getModelLogo(modelId = '') {
  const mid = modelId.toLowerCase();

  // ── Model creator / family lookups ────────────────────────────
  if (mid.startsWith('qwen/') || mid.includes('/qwen') || mid.includes('qwen')) return '/logos/qwen.svg';
  if (mid.startsWith('stabilityai/') || mid.includes('stable-diffusion') || mid.includes('/svd')) return '/logos/stability.svg';
  if (mid.startsWith('meta/') || mid.startsWith('meta-llama/') || mid.includes('/llama') || mid.includes('llama-')) return '/logos/meta.svg';
  if (mid.startsWith('google/') || mid.includes('/gemma') || mid.includes('gemma-')) return '/logos/gemma.svg';
  if (mid.startsWith('mistralai/') || mid.includes('/mistral') || mid.includes('codestral') || mid.includes('pixtral')) return '/logos/mistral.svg';
  if (mid.startsWith('deepseek-ai/') || mid.includes('/deepseek') || mid.includes('deepseek-')) return '/logos/deepseek.svg';
  if (mid.startsWith('microsoft/') || mid.includes('/phi-') || mid.includes('phi-')) return '/logos/microsoft.svg';
  if (mid.startsWith('ibm/') || mid.startsWith('ibm-granite/') || mid.includes('/granite') || mid.includes('granite-')) return '/logos/ibm.svg';
  if (mid.startsWith('writer/') || mid.includes('palmyra')) return '/logos/writer.svg';
  if (mid.startsWith('moonshotai/') || mid.includes('/kimi') || mid.includes('kimi-')) return '/logos/moonshot.svg';
  if (mid.startsWith('01-ai/') || mid.includes('yi-')) return '/logos/01ai.svg';
  if (mid.startsWith('databricks/') || mid.includes('dbrx')) return '/logos/databricks.svg';
  if (mid.startsWith('snowflake/') || mid.includes('arctic')) return '/logos/snowflake.svg';
  if (mid.startsWith('z-ai/') || mid.startsWith('zai-org/') || mid.includes('/glm') || mid.includes('glm-')) return '/logos/glm.svg';
  if (mid.startsWith('aisingapore/') || mid.includes('sea-lion')) return '/logos/aisingapore.png';
  if (mid.startsWith('poolside/') || mid.includes('poolside')) return '/logos/poolside.svg';
  if (mid.startsWith('ai21labs/') || mid.includes('jamba')) return '/logos/ai21.svg';
  if (mid.startsWith('bigcode/') || mid.includes('starcoder')) return '/logos/bigcode.svg';
  if (mid.startsWith('zyphra/')) return '/logos/zyphra.png';
  if (mid.startsWith('openai/') || mid.includes('gpt-')) return '/logos/openai.svg';
  if (mid.startsWith('anthropic/') || mid.includes('claude-')) return '/logos/anthropic.svg';
  if (mid.startsWith('cohere/') || mid.includes('command-')) return '/logos/cohere.svg';
  if (mid.startsWith('groq/')) return '/logos/groq.svg';
  if (mid.startsWith('perplexity/') || mid.includes('sonar')) return '/logos/perplexity.svg';
  if (mid.startsWith('huggingface/') || mid.startsWith('hf/')) return '/logos/huggingface.svg';

  // Default for NVIDIA-hosted / unknown models
  return '/logos/nvidia.svg';
}
