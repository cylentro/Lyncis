'use server';

/**
 * Server Action to provide non-sensitive configuration to the client.
 * This keeps environment variables private while still allowing the client to know
 * which features are enabled.
 */
export async function getParserConfig() {
    return {
        enableAI: process.env.PARSER_ENABLE_AI !== 'false',
        enableRegex: process.env.PARSER_ENABLE_REGEX !== 'false',
        regexThreshold: parseFloat(process.env.PARSER_REGEX_THRESHOLD || '0.85'),
        intakeMethods: (process.env.INTAKE_METHODS || 'manual,excel,whatsapp').split(',').map(m => m.trim())
    };
}
