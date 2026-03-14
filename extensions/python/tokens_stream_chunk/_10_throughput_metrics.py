import time
from helpers.extension import Extension

class ThroughputMetrics(Extension):
    """
    Extension to track token throughput metrics (TPS) and update the UI.
    Hooks into the 'tokens_stream_chunk' extension point.
    """

    async def execute(self, **kwargs):
        if not self.agent or not self.agent.loop_data:
            return

        token_count = kwargs.get("token_count", 0)
        if token_count <= 0:
            return

        # Initialize or fetch stream metrics from loop_data to persist across chunks
        params = self.agent.loop_data.params_temporary
        metrics = params.get("stream_metrics")
        
        if not metrics:
            metrics = {
                "started_at": time.monotonic(),
                "output_tokens": 0,
                "tokens_per_second": 0.0,
            }
            params["stream_metrics"] = metrics

        # Update metrics
        metrics["output_tokens"] += token_count
        elapsed = max(time.monotonic() - metrics["started_at"], 1e-3)
        metrics["tokens_per_second"] = metrics["output_tokens"] / elapsed

        # Update log item for real-time WebUI display
        log_item = params.get("log_item_generating")
        if log_item:
            kvps = dict(log_item.kvps or {})
            kvps["output_tokens"] = metrics["output_tokens"]
            kvps["tokens_per_second"] = round(metrics["tokens_per_second"], 1)
            log_item.update(kvps=kvps)
