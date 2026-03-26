from helpers.api import ApiHandler, Request, Response


class ChatStop(ApiHandler):
    async def process(self, input: dict, request: Request) -> dict | Response:
        ctxid = input.get("context", "")

        if not ctxid:
            raise Exception("No context id provided")

        context = self.use_context(ctxid)

        # Kill the current process
        context.kill_process()
        
        # Clear paused state
        context.paused = False
        
        # Log the stop event
        context.log.log(type="info", content="Generation stopped by user")

        return {
            "message": "Processing canceled.",
            "context": ctxid,
        }
