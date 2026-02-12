import json
import re


def parse_json_response(text: str) -> dict:
    """Robust JSON extraction from LLM output.

    Tries multiple strategies:
    1. Direct JSON parse of the full text
    2. Extract ```json ... ``` fenced block
    3. Find first { and match to last }
    4. Raise ValueError if all fail
    """
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    fenced = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1).strip())
        except json.JSONDecodeError:
            pass

    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace : last_brace + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Failed to parse JSON from LLM response: {text[:200]}...")
