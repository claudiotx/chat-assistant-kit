import type { TelemetryOptions } from 'ai';
import { logger } from '../logger.js';

// Off by default: telemetry only turns on when explicitly configured. Nothing
// here runs unless AI_TELEMETRY_ENABLED=true.
let telemetryEnabled = false;
let initPromise: Promise<void> | null = null;

async function doInit(): Promise<void> {
	if (process.env['AI_TELEMETRY_ENABLED'] !== 'true') return;

	const publicKey = process.env['LANGFUSE_PUBLIC_KEY'];
	const secretKey = process.env['LANGFUSE_SECRET_KEY'];

	if (!publicKey || !secretKey) {
		logger.error('AI_TELEMETRY_ENABLED is true but LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY are missing');
		return;
	}

	try {
		const [{ LangfuseSpanProcessor }, { NodeTracerProvider }] = await Promise.all([
			import('@langfuse/otel'),
			import('@opentelemetry/sdk-trace-node'),
		]);

		// Registers this provider as the process-wide OpenTelemetry tracer, so any
		// spans the `ai` package emits (via `telemetry: {isEnabled: true}` below)
		// flow through it automatically — no per-call tracer wiring needed in this
		// AI SDK version.
		const provider = new NodeTracerProvider({
			spanProcessors: [new LangfuseSpanProcessor()],
		});

		provider.register();

		telemetryEnabled = true;
		logger.info('AI telemetry enabled via Langfuse');
	} catch (error) {
		logger.error('Failed to initialize AI telemetry', { error: String(error) });
	}
}

export const initAITelemetry = async (): Promise<void> => {
	if (telemetryEnabled) return;
	if (initPromise) return initPromise;

	const promise = doInit().finally(() => {
		initPromise = null;
	});

	initPromise = promise;

	return promise;
};

// NOTE: this AI SDK version's `TelemetryOptions` has no `metadata` field for
// attaching per-call info like userId/model to spans. The replacement path is
// `runtimeContext` + `includeRuntimeContext`, which requires wiring a runtime
// context object into every `streamText` call — skipped here to keep telemetry
// setup simple; revisit if per-user span attribution becomes important.
export const getAITelemetryConfig = (): TelemetryOptions | undefined => {
	if (!telemetryEnabled) return undefined;

	const recordIO = process.env['AI_TELEMETRY_RECORD_IO'] === 'true';

	return {
		isEnabled: true,
		functionId: 'chat',
		recordInputs: recordIO,
		recordOutputs: recordIO,
	};
};
