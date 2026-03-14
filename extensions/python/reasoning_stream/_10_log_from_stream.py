from python.helpers import persist_chat, tokens
from python.helpers.extension import Extension
from agent import LoopData
import asyncio
from python.helpers.log import LogItem
from python.helpers import log
import math
from python.extensions.before_main_llm_call._10_log_for_stream import build_heading, build_default_heading

class LogFromStream(Extension):

    async def execute(self, loop_data: LoopData = LoopData(), text: str = "", **kwargs):
        if not self.agent:
            return

        # thought length indicator
        length = f"({len(text)})" if text else ""
        pipes = "|" * math.ceil(math.sqrt(len(text))/2)
        heading = build_heading(self.agent, f"Reasoning... {pipes}")
        step = f"Reasoning... {length}"

        # create log message and store it in loop data temporary params
        if "log_item_generating" not in loop_data.params_temporary:
            loop_data.params_temporary["log_item_generating"] = (
                self.agent.context.log.log(
                    type="agent",
                    heading=heading,
                    step=step
                )
            )

        # update log message
        log_item = loop_data.params_temporary["log_item_generating"]
        metrics = loop_data.params_temporary.get("stream_metrics") or {}
        kvps = dict(log_item.kvps or {})
        if "output_tokens" in metrics:
            kvps["output_tokens"] = metrics["output_tokens"]
        if "tokens_per_second" in metrics:
            kvps["tokens_per_second"] = round(metrics["tokens_per_second"], 1)
        log_item.update(heading=heading, reasoning=text, step=step, kvps=kvps)
