import csv
import io


REQUIRED_COLUMNS = {"product_name", "specifications", "image_url"}


def parse_product_csv(file_content: bytes) -> list[dict]:
    """Parse CSV with columns: product_name, specifications, image_url.

    Validates that all required columns exist and returns a list of row dicts.
    """
    text = file_content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise ValueError("CSV file is empty or has no header row")

    headers = {h.strip().lower() for h in reader.fieldnames}
    missing = REQUIRED_COLUMNS - headers
    if missing:
        raise ValueError(f"CSV missing required columns: {', '.join(sorted(missing))}")

    rows = []
    for i, row in enumerate(reader, start=2):
        cleaned = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        if not cleaned.get("product_name"):
            raise ValueError(f"Row {i}: product_name is empty")
        if not cleaned.get("specifications"):
            raise ValueError(f"Row {i}: specifications is empty")
        if not cleaned.get("image_url"):
            raise ValueError(f"Row {i}: image_url is empty")
        rows.append(cleaned)

    if not rows:
        raise ValueError("CSV file contains no data rows")

    return rows
