import logging

from app.ai.gemini import GeminiService
from app.config import Settings
from app.models.common import QCScore
from app.models.storyboard import StoryboardQCReport
from app.models.video import VideoQCDimension, VideoQCReport, VideoVariant

logger = logging.getLogger(__name__)


class QCService:
    def __init__(self, gemini: GeminiService, settings: Settings):
        self.gemini = gemini
        self.settings = settings

    async def qc_storyboard(
        self,
        avatar_bytes: bytes,
        product_bytes: bytes,
        storyboard_bytes: bytes,
    ) -> StoryboardQCReport:
        """Run QC on a storyboard image against avatar and product references."""
        raw = await self.gemini.qc_storyboard(
            avatar_bytes=avatar_bytes,
            product_bytes=product_bytes,
            storyboard_bytes=storyboard_bytes,
        )
        return StoryboardQCReport(
            avatar_validation=QCScore(**raw["avatar_validation"]),
            product_validation=QCScore(**raw["product_validation"]),
            composition_quality=QCScore(**raw.get("composition_quality", {"score": 0, "reason": "N/A"})),
        )

    async def qc_video(self, video_uri: str, reference_uri: str) -> VideoQCReport:
        """Run QC on a video against its reference product image."""
        raw = await self.gemini.qc_video(
            video_uri=video_uri,
            reference_image_uri=reference_uri,
        )
        return VideoQCReport(
            technical_distortion=VideoQCDimension(**raw["technical_distortion"]),
            cinematic_imperfections=VideoQCDimension(**raw["cinematic_imperfections"]),
            avatar_consistency=VideoQCDimension(**raw["avatar_consistency"]),
            product_consistency=VideoQCDimension(**raw["product_consistency"]),
            temporal_coherence=VideoQCDimension(**raw["temporal_coherence"]),
            overall_verdict=raw.get("overall_verdict", ""),
        )

    def storyboard_passes_qc(self, report: StoryboardQCReport) -> bool:
        """Check if avatar and product scores meet the threshold."""
        threshold = self.settings.storyboard_qc_threshold
        return (
            report.avatar_validation.score >= threshold
            and report.product_validation.score >= threshold
        )

    def video_passes_qc(self, report: VideoQCReport) -> bool:
        """Check if all video QC dimension scores meet the threshold."""
        threshold = self.settings.video_qc_threshold
        return (
            report.technical_distortion.score >= threshold
            and report.cinematic_imperfections.score >= threshold
            and report.avatar_consistency.score >= threshold
            and report.product_consistency.score >= threshold
            and report.temporal_coherence.score >= threshold
        )

    async def rewrite_prompt(self, original_prompt: str, qc_report: StoryboardQCReport) -> str:
        """Use Gemini to rewrite a prompt based on QC feedback."""
        feedback_parts: list[str] = []
        feedback_parts.append(
            f"Avatar validation score: {qc_report.avatar_validation.score}/100 - "
            f"{qc_report.avatar_validation.reason}"
        )
        feedback_parts.append(
            f"Product validation score: {qc_report.product_validation.score}/100 - "
            f"{qc_report.product_validation.reason}"
        )
        if qc_report.composition_quality:
            feedback_parts.append(
                f"Composition quality score: {qc_report.composition_quality.score}/100 - "
                f"{qc_report.composition_quality.reason}"
            )
        qc_feedback = "\n".join(feedback_parts)
        return await self.gemini.rewrite_prompt(original_prompt, qc_feedback)

    def select_best_video_variant(self, variants: list[VideoVariant]) -> int:
        """Select the best video variant using weighted scoring.

        Weights:
          avatar_consistency  * 0.35
          product_consistency * 0.35
          technical_distortion * 0.15
          cinematic_imperfections * 0.15

        Returns index of the best variant.
        """
        best_idx = 0
        best_score = -1.0

        for variant in variants:
            if variant.qc_report is None:
                continue
            r = variant.qc_report
            score = (
                r.avatar_consistency.score * 0.35
                + r.product_consistency.score * 0.35
                + r.technical_distortion.score * 0.15
                + r.cinematic_imperfections.score * 0.15
            )
            if score > best_score:
                best_score = score
                best_idx = variant.index

        return best_idx
