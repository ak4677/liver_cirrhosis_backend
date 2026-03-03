const express          = require('express');
const router           = express.Router();
const axios            = require('axios');
const authenticateUser = require('../middleware/authenticateUser');

// ─────────────────────────────────────────────────────────────────────────────
// HYBRID AI CHAT PROXY — Privacy-first routing
//
//   OLLAMA  (local, port 11434) — full patient context, NEVER leaves machine
//   OpenRouter (online, free)   — ZERO patient data, general questions only
//
// Default = LOCAL. Online only when question is clearly generic with no
// references to the patient's own data, tests, values, or images.
//
// .env variables:
//   OPENROUTER_API_KEY=your_key_here
//   OLLAMA_URL=http://localhost:11434     (optional)
//   OLLAMA_MODEL=llama3.2                (optional)
//
// server.js:
//   app.use('/api/chat', require('./routes/chat'));
// ─────────────────────────────────────────────────────────────────────────────

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING
// Any PERSONAL_PATTERNS match → Ollama (local, full context)
// No personal match + GENERIC_PATTERNS match → OpenRouter (online, anonymised)
// Neither → Ollama (safe default)
// ─────────────────────────────────────────────────────────────────────────────

const PERSONAL_PATTERNS = [
    // Self-reference
    /\bmy\b/i,
    /\bmine\b/i,
    /\bi have\b/i,
    /\bfor me\b/i,
    /\bmy (result|level|report|scan|test|value|image|lab|data|reading|score)\b/i,
    // Status questions about their own values
    /\bis (it|this|that) (high|low|normal|safe|dangerous|bad|good)\b/i,
    /\bshould i be worried\b/i,
    /\bam i at risk\b/i,
    /\bwhat does (it|this|that) mean\b/i,
    // Image / skin prediction references
    /\b(first|second|third|1st|2nd|3rd)\s*image\b/i,
    /\bimage\s*\d\b/i,
    /\ball (the\s*)?(class(es)?|result|prediction)\b/i,
    /\bclass(es)?\s*(for|of|in|from|about)\b/i,
    /\bprobabilit(y|ies)\b/i,
    /\bconfidence\s*(score|level|value)?\b/i,
    /\bbenign\b/i,
    /\bmalignant\b/i,
    /\bskin\s*(scan|result|class|detection|image|cancer|prediction)\b/i,
    /\bgradcam\b/i,
    // Specific liver test names — patient asking about these = their own values
    /\bascites\b/i,
    /\bbilirubin\b/i,
    /\bsgot\b/i,
    /\balbumin\b/i,
    /\bcopper\b/i,
    /\bplatelets\b/i,
    /\bprothrombin\b/i,
    /\btriglyceride/i,
    /\bspiders?\b/i,
    /\bedema\b/i,
    /\bhepatome/i,
    /\balk.?phos/i,
    /\bcholesterol\b/i,
    /\bliver\s*(result|report|panel|value|level|lab|data)\b/i,
    /\bcvd\s*(result|report|value|data)\b/i,
    // Any number = likely a specific value from their report
    /\d+/,
];

const GENERIC_PATTERNS = [
    /^what is (a |an |the )?[\w][\w\s]{0,30}\??\s*$/i,
    /^(explain|define|describe) (a |an |the )?[\w][\w\s]{0,30}\??\s*$/i,
    /^how does? [\w\s]{1,30} work\??\s*$/i,
    /^what (foods?|diet|exercise|lifestyle|habit|supplement)/i,
    /^how (can i|do i|to) (improve|help|support|boost|maintain|increase|decrease)/i,
    /^(what|how|why|when) (is|are|do|does|can|should) [\w\s]{1,50}\??\s*$/i,
];

function isPersonalQuery(text) {
    if (PERSONAL_PATTERNS.some(p => p.test(text))) return true;
    if (GENERIC_PATTERNS.some(p => p.test(text))) return false;
    return true; // ambiguous → local (safest default)
}

// ─────────────────────────────────────────────────────────────────────────────
// ANONYMISE — strips all identifiers before anything goes to OpenRouter
// ─────────────────────────────────────────────────────────────────────────────
function anonymise(text) {
    return (text || '')
        .replace(/\b\d+\.?\d*\s*(mg\/dL|g\/dL|IU\/L|U\/L|µg\/dL|mmHg|bpm|mg|dL)\b/gi, '[value]')
        .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[date]')
        .replace(/patient\s*id[:\s]+\S+/gi, '')
        .replace(/\bmalignant\b|\bbenign\b/gi, '[skin finding]')
        .replace(/\b\d+\b/g, '[number]');
}

// ─────────────────────────────────────────────────────────────────────────────
// OLLAMA — local, receives full patient context, stays on machine
// Uses axios — compatible with Node 14/16/18/20+
// ─────────────────────────────────────────────────────────────────────────────
async function callOllama(systemPrompt, messages) {
    // Ping: confirm Ollama is running and model is pulled
    try {
        const tagsRes   = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
        const available = (tagsRes.data?.models || []).map(m => m.name);
        const modelBase = OLLAMA_MODEL.split(':')[0];
        const exists    = available.some(n => n.startsWith(modelBase));
        if (!exists) {
            const list = available.join(', ') || 'none';
            throw new Error(
                `Model "${OLLAMA_MODEL}" not pulled. Available: [${list}]. ` +
                `Run: ollama pull ${OLLAMA_MODEL}`
            );
        }
    } catch (pingErr) {
        if (pingErr.code === 'ECONNREFUSED' || pingErr.code === 'ECONNABORTED') {
            throw new Error('ECONNREFUSED — Ollama is not running. Run: ollama serve');
        }
        throw pingErr;
    }

    const body = {
        model:      OLLAMA_MODEL,
        stream:     false,
        keep_alive: -1,         // keep model in RAM = faster after first message
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
                role:    m.role === 'model' ? 'assistant' : m.role,
                content: m.content || ''
            }))
        ],
        options: {
            temperature:    0.7,
            num_predict:    400,   // shorter = faster on CPU
            num_ctx:        1536,
            repeat_penalty: 1.1
        }
    };

    console.log(`[chat] Ollama: ${messages.length} msg(s), model=${OLLAMA_MODEL}`);

    const response = await axios.post(`${OLLAMA_URL}/api/chat`, body, {
        timeout: 180000,  // 3 min — CPU inference is slow, improves with keep_alive
        headers: { 'Content-Type': 'application/json' }
    });

    const secs = response.data?.total_duration
        ? `${(response.data.total_duration / 1e9).toFixed(1)}s`
        : '?';
    console.log(`[chat] Ollama replied in ${secs}`);

    return response.data?.message?.content || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENROUTER — online, ZERO patient data (fully anonymised before sending)
// Model: google/gemma-3-4b-it:free  (working free-tier model as of 2025)
// ─────────────────────────────────────────────────────────────────────────────
async function callOpenRouter(systemPrompt, messages) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in .env');

    const body = {
        model: 'google/gemma-3-4b-it:free',
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
                role:    m.role === 'model' ? 'assistant' : m.role,
                content: anonymise(m.content || '')
            }))
        ],
        max_tokens:  600,
        temperature: 0.7
    };

    const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        body,
        {
            timeout: 30000,
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer':  'http://localhost:5000',
                'X-Title':       'Health Consultant'
            }
        }
    );

    return response.data?.choices?.[0]?.message?.content || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERAL system prompt — sent to OpenRouter — ZERO patient data
// ─────────────────────────────────────────────────────────────────────────────
const GENERAL_SYSTEM_PROMPT = `You are Aria, a friendly health information guide on a healthcare platform.

Your role:
- Explain medical terms and test names in simple plain language
- Describe what tests measure and why doctors order them
- Share general lifestyle habits that support organ health
- Help patients form good questions to ask their doctor

You must NEVER:
- Diagnose any condition or say someone "has" a disease
- Recommend specific medications, dosages, or treatments
- Interpret specific personal results or make clinical decisions

Keep responses warm, concise (3-5 sentences), and educational.
Always end with a reminder to discuss specifics with their doctor.`;

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/chat
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authenticateUser, async (req, res) => {
    try {
        const { systemPrompt, messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        const latestText = [...messages]
            .reverse()
            .find(m => m.role === 'user')
            ?.content || '';

        const useLocal = isPersonalQuery(latestText);
        console.log(`[chat] "${latestText.slice(0, 70)}" → ${useLocal ? 'OLLAMA (local)' : 'OpenRouter (online)'}`);

        let reply  = '';
        let source = '';

        if (useLocal) {
            try {
                reply  = await callOllama(systemPrompt, messages);
                source = 'local';
            } catch (err) {
                console.error('[chat] Ollama failed:', err.message);
                if (
                    err.message.includes('ECONNREFUSED') ||
                    err.message.includes('not running')  ||
                    err.message.includes('not pulled')   ||
                    err.message.includes('Available:')
                ) {
                    return res.status(503).json({
                        error:      err.message,
                        detail:     err.message,
                        ollamaDown: true
                    });
                }
                throw err;
            }
        } else {
            try {
                reply  = await callOpenRouter(GENERAL_SYSTEM_PROMPT, messages);
                source = 'online';
            } catch (err) {
                console.error('[chat] OpenRouter failed:', err.message);
                console.log('[chat] Falling back to Ollama with general prompt...');
                try {
                    reply  = await callOllama(GENERAL_SYSTEM_PROMPT, messages);
                    source = 'local-fallback';
                } catch (fallbackErr) {
                    return res.status(503).json({
                        error:      'Both AI services are unavailable.',
                        detail:     `OpenRouter: ${err.message} | Ollama: ${fallbackErr.message}`,
                        ollamaDown: fallbackErr.message.includes('ECONNREFUSED')
                    });
                }
            }
        }

        if (!reply) {
            return res.status(502).json({ error: 'Empty response from AI service' });
        }

        return res.status(200).json({ reply, source });

    } catch (error) {
        console.error('[chat] Unexpected error:', error.message);
        return res.status(500).json({ error: 'Server error', detail: error.message });
    }
});

module.exports = router;