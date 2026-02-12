from pathlib import Path

from google.cloud import storage


class GCSStorage:
    def __init__(self, bucket_name: str, project_id: str):
        self.client = storage.Client(project=project_id)
        self.bucket = self.client.bucket(bucket_name)
        self.bucket_name = bucket_name

    def upload_bytes(
        self, data: bytes, dest_path: str, content_type: str = "image/png"
    ) -> str:
        blob = self.bucket.blob(dest_path)
        blob.upload_from_string(data, content_type=content_type)
        return f"gs://{self.bucket_name}/{dest_path}"

    def upload_file(self, source_path: str, dest_path: str) -> str:
        blob = self.bucket.blob(dest_path)
        blob.upload_from_filename(source_path)
        return f"gs://{self.bucket_name}/{dest_path}"

    def download_to_local(self, gcs_uri: str, local_path: str) -> str:
        blob_path = gcs_uri.replace(f"gs://{self.bucket_name}/", "")
        blob = self.bucket.blob(blob_path)
        Path(local_path).parent.mkdir(parents=True, exist_ok=True)
        blob.download_to_filename(local_path)
        return local_path

    def get_veo_output_uri(self, run_id: str) -> str:
        return f"gs://{self.bucket_name}/pipeline/{run_id}/videos/"
